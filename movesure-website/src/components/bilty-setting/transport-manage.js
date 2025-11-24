'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../app/utils/auth';
import supabase from '../../app/utils/supabase';
import TransportSearchBar from './transport-search-bar';
import { 
  searchTransporters, 
  filterByCity,
  sortTransporters,
  isValidGST,
  isValidMobile,
  formatMobile,
  exportToCSV 
} from './transport-search-helper';

const TransportersComponent = () => {
  const { user } = useAuth();
  const [transporters, setTransporters] = useState([]);
  const [filteredTransporters, setFilteredTransporters] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    transport_name: '',
    city_id: '',
    city_name: '',
    address: '',
    gst_number: '',
    mob_number: '',
    branch_owner_name: '',
    website: ''
  });
  const [editingId, setEditingId] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});
  const [groupBy, setGroupBy] = useState('city'); // 'city', 'gst', 'name', 'mobile'

  useEffect(() => {
    fetchCities();
    fetchTransporters();
  }, []);

  useEffect(() => {
    filterAndSortTransporters();
  }, [transporters, searchTerm, selectedCity, sortBy, sortOrder]);

  const filterAndSortTransporters = () => {
    let result = [...transporters];

    // Apply city filter
    if (selectedCity) {
      result = filterByCity(result, selectedCity);
    }

    // Apply search filter
    if (searchTerm.trim()) {
      result = searchTransporters(result, searchTerm);
    }

    // Apply sorting
    result = sortTransporters(result, sortBy, sortOrder);

    setFilteredTransporters(result);
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
  };

  const handleCityFilter = (cityId) => {
    setSelectedCity(cityId);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const fetchCities = async () => {
    try {
      const { data, error } = await supabase
        .from('cities')
        .select('*')
        .order('city_name');

      if (error) throw error;
      setCities(data || []);
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  };

  const fetchTransporters = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('transports')
        .select(`
          *,
          cities (
            city_name,
            city_code
          )
        `)
        .order('transport_name');

      if (error) throw error;
      setTransporters(data || []);
    } catch (error) {
      console.error('Error fetching transporters:', error);
      alert('Error fetching transporters: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCityChange = (cityId) => {
    const selectedCity = cities.find(city => city.id === cityId);
    setFormData({
      ...formData,
      city_id: cityId,
      city_name: selectedCity ? selectedCity.city_name : ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.transport_name.trim() || !formData.city_id || !formData.address.trim()) {
      alert('Please fill all required fields');
      return;
    }

    // Validate GST number
    if (formData.gst_number && !isValidGST(formData.gst_number)) {
      alert('Invalid GST number format. Please enter a valid 15-digit GST number.');
      return;
    }

    // Validate mobile number
    if (formData.mob_number && !isValidMobile(formData.mob_number)) {
      alert('Invalid mobile number. Please enter a valid 10-digit mobile number.');
      return;
    }

    try {
      setLoading(true);

      const transportData = {
        transport_name: formData.transport_name.trim(),
        city_id: formData.city_id,
        city_name: formData.city_name,
        address: formData.address.trim(),
        gst_number: formData.gst_number.trim() || null,
        mob_number: formData.mob_number.trim() || null,
        branch_owner_name: formData.branch_owner_name.trim() || null,
        website: formData.website.trim() || null
      };

      if (editingId) {
        const { error } = await supabase
          .from('transports')
          .update(transportData)
          .eq('id', editingId);

        if (error) throw error;
        alert('Transporter updated successfully!');
      } else {
        const { error } = await supabase
          .from('transports')
          .insert([transportData]);

        if (error) throw error;
        alert('Transporter added successfully!');
      }

      setFormData({
        transport_name: '',
        city_id: '',
        city_name: '',
        address: '',
        gst_number: '',
        mob_number: '',
        branch_owner_name: '',
        website: ''
      });
      setEditingId(null);
      setShowForm(false);
      setExpandedRows({});
      fetchTransporters();
    } catch (error) {
      console.error('Error saving transporter:', error);
      alert('Error saving transporter: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (transporter) => {
    setFormData({
      transport_name: transporter.transport_name,
      city_id: transporter.city_id,
      city_name: transporter.city_name,
      address: transporter.address,
      gst_number: transporter.gst_number || '',
      mob_number: transporter.mob_number || '',
      branch_owner_name: transporter.branch_owner_name || '',
      website: transporter.website || ''
    });
    setEditingId(transporter.id);
    setExpandedRows({ [transporter.id]: true });
  };

  const handleInlineCancel = () => {
    setEditingId(null);
    setExpandedRows({});
    setFormData({
      transport_name: '',
      city_id: '',
      city_name: '',
      address: '',
      gst_number: '',
      mob_number: '',
      branch_owner_name: '',
      website: ''
    });
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this transporter?')) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('transports')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('Transporter deleted successfully!');
      fetchTransporters();
    } catch (error) {
      console.error('Error deleting transporter:', error);
      alert('Error deleting transporter: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setFormData({
      transport_name: '',
      city_id: '',
      city_name: '',
      address: '',
      gst_number: '',
      mob_number: '',
      branch_owner_name: '',
      website: ''
    });
    setEditingId(null);
    setShowForm(false);
  };

  const downloadCSV = () => {
    const dataToExport = filteredTransporters.length > 0 ? filteredTransporters : transporters;
    
    if (dataToExport.length === 0) {
      alert('No data to export');
      return;
    }

    const csvContent = exportToCSV(dataToExport);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `transporters_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alert(`Exported ${dataToExport.length} transporters to CSV`);
  };

  const getSortIcon = (field) => {
    if (sortBy !== field) return '⇅';
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  const getGroupedTransporters = () => {
    const grouped = {};
    
    filteredTransporters.forEach(transporter => {
      let groupKey, groupLabel, groupCount, isDuplicate;
      
      switch(groupBy) {
        case 'gst':
          groupKey = transporter.gst_number?.trim() || 'No GST';
          groupLabel = groupKey;
          break;
        case 'name':
          groupKey = transporter.transport_name?.trim() || 'No Name';
          groupLabel = groupKey;
          break;
        case 'mobile':
          groupKey = transporter.mob_number?.trim() || 'No Mobile';
          groupLabel = groupKey;
          break;
        case 'city':
        default:
          groupKey = transporter.cities?.city_name || transporter.city_name || 'Unknown';
          groupLabel = groupKey;
          break;
      }
      
      if (!grouped[groupKey]) {
        grouped[groupKey] = {
          groupLabel: groupLabel,
          cityName: transporter.cities?.city_name || transporter.city_name || '',
          cityCode: transporter.cities?.city_code || '',
          cityId: transporter.city_id,
          transporters: []
        };
      }
      grouped[groupKey].transporters.push(transporter);
    });
    
    // Mark groups with duplicates (more than 1 transporter with same key)
    const groupedArray = Object.values(grouped).map(group => ({
      ...group,
      isDuplicate: group.transporters.length > 1,
      count: group.transporters.length
    }));
    
    // Sort: duplicates first, then alphabetically
    return groupedArray.sort((a, b) => {
      if (a.isDuplicate && !b.isDuplicate) return -1;
      if (!a.isDuplicate && b.isDuplicate) return 1;
      return a.groupLabel.localeCompare(b.groupLabel);
    });
  };

  return (
    <div className="w-full">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg border border-blue-200 mb-3">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-gray-900">🚛 Transport Management</h2>
            <p className="text-xs text-gray-600">Manage transport companies</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-1 text-xs font-medium shadow"
            >
              {showForm ? '📋 List' : '➕ Add'}
            </button>
            <button
              onClick={downloadCSV}
              disabled={transporters.length === 0}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-1 disabled:opacity-50 text-xs font-medium shadow"
            >
              📥 Export
            </button>
          </div>
        </div>
      </div>
      
      {/* Group By Controls */}
      {!showForm && (
        <div className="bg-white p-2 rounded-lg border border-gray-200 mb-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-700">Group By:</span>
            <div className="flex gap-1">
              <button
                onClick={() => setGroupBy('city')}
                className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                  groupBy === 'city' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🏙️ City
              </button>
              <button
                onClick={() => setGroupBy('gst')}
                className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                  groupBy === 'gst' 
                    ? 'bg-orange-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📋 GST Number
              </button>
              <button
                onClick={() => setGroupBy('name')}
                className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                  groupBy === 'name' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🏢 Transport Name
              </button>
              <button
                onClick={() => setGroupBy('mobile')}
                className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                  groupBy === 'mobile' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📱 Mobile Number
              </button>
            </div>
          </div>
          {groupBy !== 'city' && (
            <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
              <p className="text-xs text-yellow-800">
                <span className="font-semibold">⚠️ Duplicate Detection:</span> Groups with multiple entries are highlighted to help identify incorrect GST, names, or mobile numbers.
              </p>
            </div>
          )}
        </div>
      )}

      {cities.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-300 text-yellow-900 px-3 py-2 rounded-lg flex items-center mb-3">
          <span className="text-base mr-2">⚠️</span>
          <p className="text-xs font-medium">Please add cities first before adding transporters.</p>
        </div>
      )}

      {/* Enhanced Search Bar with City Filter */}
      {!showForm && (
        <div className="bg-white p-3 rounded-lg shadow border border-gray-200 mb-3">
          <TransportSearchBar
            transporters={transporters}
            onSearch={handleSearch}
            onCityFilter={handleCityFilter}
            selectedCity={selectedCity}
            cities={cities}
          />
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow border border-gray-200 mb-3">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-base font-bold text-gray-900">
              {editingId ? '✏️ Edit Transporter' : '➕ Add Transporter'}
            </h3>
            <button
              type="button"
              onClick={cancelEdit}
              className="text-gray-500 hover:text-gray-700 text-lg"
            >
              ✖
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Transport Name *</label>
              <input
                type="text"
                value={formData.transport_name}
                onChange={(e) => setFormData({ ...formData, transport_name: e.target.value })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-black focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Transport name"
                disabled={loading}
                required
                maxLength={100}
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">City *</label>
              <select
                value={formData.city_id}
                onChange={(e) => handleCityChange(e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-black focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={loading || cities.length === 0}
                required
              >
                <option value="">Select City</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.city_name} ({city.city_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">GST Number</label>
              <input
                type="text"
                value={formData.gst_number}
                onChange={(e) => setFormData({ ...formData, gst_number: e.target.value.toUpperCase() })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-black focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="GST (15 digits)"
                disabled={loading}
                maxLength={15}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Mobile Number</label>
              <input
                type="tel"
                value={formData.mob_number}
                onChange={(e) => setFormData({ ...formData, mob_number: e.target.value.replace(/\D/g, '') })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-black focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="10 digits"
                disabled={loading}
                maxLength={10}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Owner Name</label>
              <input
                type="text"
                value={formData.branch_owner_name}
                onChange={(e) => setFormData({ ...formData, branch_owner_name: e.target.value })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-black focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Owner name"
                disabled={loading}
                maxLength={100}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Website</label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-black focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="https://example.com"
                disabled={loading}
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-gray-700 mb-1">Address *</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-black focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Complete address"
                rows="2"
                disabled={loading}
                required
                maxLength={500}
              />
            </div>
          </div>
          
          <div className="flex gap-2 pt-2 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading || cities.length === 0}
              className="bg-blue-600 text-white px-4 py-1.5 rounded text-xs hover:bg-blue-700 disabled:opacity-50 font-medium shadow"
            >
              {loading ? '⏳ Saving...' : editingId ? '✏️ Update' : '➕ Add'}
            </button>
            
            <button
              type="button"
              onClick={cancelEdit}
              className="bg-gray-500 text-white px-4 py-1.5 rounded text-xs hover:bg-gray-600 font-medium shadow"
            >
              ❌ Cancel
            </button>
          </div>
        </form>
      )}

      {/* Statistics & Results */}
      {!showForm && (
        <div className="bg-white p-3 rounded-lg shadow border border-gray-200">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center space-x-2">
              <div className="bg-blue-100 px-2 py-1 rounded">
                <span className="text-xs font-medium text-gray-600">Total: </span>
                <span className="text-sm font-bold text-blue-600">{transporters.length}</span>
              </div>
              {(searchTerm || selectedCity) && (
                <div className="bg-green-100 px-2 py-1 rounded">
                  <span className="text-xs font-medium text-gray-600">Filtered: </span>
                  <span className="text-sm font-bold text-green-600">{filteredTransporters.length}</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-1">
              <span className="text-xs text-gray-600">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="name">Name</option>
                <option value="city">City</option>
                <option value="owner">Owner</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs"
                title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>

          {/* Transporters Table */}
          <div className="overflow-x-auto rounded border border-gray-200">
            <table className="min-w-full table-auto border-collapse text-xs">
              <thead className="bg-gray-100">
                <tr>
                  <th 
                    onClick={() => handleSort('name')}
                    className="border-r border-gray-200 px-2 py-2 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Transport</span>
                      <span className="text-xs">{getSortIcon('name')}</span>
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('city')}
                    className="border-r border-gray-200 px-2 py-2 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200"
                  >
                    <div className="flex items-center space-x-1">
                      <span>City</span>
                      <span className="text-xs">{getSortIcon('city')}</span>
                    </div>
                  </th>
                  <th className="border-r border-gray-200 px-2 py-2 text-left font-semibold text-gray-700">Address</th>
                  <th className="border-r border-gray-200 px-2 py-2 text-left font-semibold text-gray-700">GST</th>
                  <th className="border-r border-gray-200 px-2 py-2 text-left font-semibold text-gray-700">Mobile</th>
                  <th 
                    onClick={() => handleSort('owner')}
                    className="border-r border-gray-200 px-2 py-2 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Owner</span>
                      <span className="text-xs">{getSortIcon('owner')}</span>
                    </div>
                  </th>
                  <th className="px-2 py-2 text-left font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransporters.length > 0 ? (
                  getGroupedTransporters().map((group, groupIndex) => (
                    <React.Fragment key={`group-${groupBy}-${groupIndex}`}>
                      {/* Group Header */}
                      <tr className={`border-t border-b ${
                        group.isDuplicate 
                          ? 'bg-gradient-to-r from-red-50 to-orange-50 border-red-300' 
                          : groupBy === 'city'
                            ? 'bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200'
                            : 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-300'
                      }`}>
                        <td colSpan="7" className="px-2 py-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              {groupBy === 'city' && <span className="text-base">🏙️</span>}
                              {groupBy === 'gst' && <span className="text-base">📋</span>}
                              {groupBy === 'name' && <span className="text-base">🏢</span>}
                              {groupBy === 'mobile' && <span className="text-base">📱</span>}
                              
                              <span className={`text-sm font-bold ${
                                group.isDuplicate ? 'text-red-900' : 'text-indigo-900'
                              }`}>
                                {group.groupLabel}
                              </span>
                              
                              {group.isDuplicate && (
                                <span className="text-xs text-red-700 bg-red-100 px-1.5 py-0.5 rounded font-semibold">
                                  ⚠️ DUPLICATE
                                </span>
                              )}
                              
                              {groupBy === 'city' && group.cityCode && (
                                <span className="text-xs text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">
                                  {group.cityCode}
                                </span>
                              )}
                            </div>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded shadow-sm ${
                              group.isDuplicate 
                                ? 'bg-red-600 text-white' 
                                : 'bg-indigo-600 text-white'
                            }`}>
                              {group.count} {group.count === 1 ? 'entry' : 'entries'}
                            </span>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Transport Rows for this Group */}
                      {group.transporters.map((transporter, index) => (
                        <React.Fragment key={transporter.id}>
                          <tr className={`hover:bg-blue-50 transition-colors ${
                            group.isDuplicate ? 'bg-red-50' : (index % 2 === 0 ? 'bg-white' : 'bg-gray-50')
                          }`}>
                            <td className="border-r border-gray-200 px-2 py-2 text-black">
                              <span className="font-medium">{transporter.transport_name}</span>
                            </td>
                            <td className="border-r border-gray-200 px-2 py-2 text-black">
                              <div>
                                <p className="font-medium">{transporter.cities?.city_name || transporter.city_name}</p>
                                {transporter.cities?.city_code && (
                                  <p className="text-xs text-gray-500">({transporter.cities.city_code})</p>
                                )}
                              </div>
                            </td>
                            <td className="border-r border-gray-200 px-2 py-2 text-black">
                              <div className="max-w-xs truncate" title={transporter.address}>
                                {transporter.address.length > 40 
                                  ? transporter.address.substring(0, 40) + '...'
                                  : transporter.address
                                }
                              </div>
                            </td>
                            <td className="border-r border-gray-200 px-2 py-2 text-black">
                              {transporter.gst_number ? (
                                <span className="font-mono text-xs">{transporter.gst_number}</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="border-r border-gray-200 px-2 py-2 text-black">
                              {transporter.mob_number || '-'}
                            </td>
                            <td className="border-r border-gray-200 px-2 py-2 text-black">
                              {transporter.branch_owner_name || '-'}
                            </td>
                            <td className="px-2 py-2">
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleEdit(transporter)}
                                  className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-2 py-1 rounded text-xs font-medium"
                                  disabled={loading}
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => handleDelete(transporter.id)}
                                  className="bg-red-100 text-red-700 hover:bg-red-200 px-2 py-1 rounded text-xs font-medium"
                                  disabled={loading}
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                          
                          {/* Inline Edit Row */}
                          {editingId === transporter.id && expandedRows[transporter.id] && (
                            <tr className="bg-blue-50">
                              <td colSpan="7" className="px-2 py-2">
                                <form onSubmit={handleSubmit} className="grid grid-cols-3 gap-2">
                                  <div>
                                    <input
                                      type="text"
                                      value={formData.transport_name}
                                      onChange={(e) => setFormData({ ...formData, transport_name: e.target.value })}
                                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-black"
                                      placeholder="Transport name"
                                      required
                                    />
                                  </div>
                                  <div>
                                    <select
                                      value={formData.city_id}
                                      onChange={(e) => handleCityChange(e.target.value)}
                                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-black"
                                      required
                                    >
                                      <option value="">Select City</option>
                                      {cities.map((city) => (
                                        <option key={city.id} value={city.id}>
                                          {city.city_name} ({city.city_code})
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <input
                                      type="text"
                                      value={formData.gst_number}
                                      onChange={(e) => setFormData({ ...formData, gst_number: e.target.value.toUpperCase() })}
                                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-black"
                                      placeholder="GST"
                                      maxLength={15}
                                    />
                                  </div>
                                  <div>
                                    <input
                                      type="tel"
                                      value={formData.mob_number}
                                      onChange={(e) => setFormData({ ...formData, mob_number: e.target.value.replace(/\D/g, '') })}
                                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-black"
                                      placeholder="Mobile"
                                      maxLength={10}
                                    />
                                  </div>
                                  <div>
                                    <input
                                      type="text"
                                      value={formData.branch_owner_name}
                                      onChange={(e) => setFormData({ ...formData, branch_owner_name: e.target.value })}
                                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-black"
                                      placeholder="Owner"
                                    />
                                  </div>
                                  <div>
                                    <input
                                      type="url"
                                      value={formData.website}
                                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-black"
                                      placeholder="Website"
                                    />
                                  </div>
                                  <div className="col-span-3">
                                    <textarea
                                      value={formData.address}
                                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-black"
                                      placeholder="Address"
                                      rows="2"
                                      required
                                    />
                                  </div>
                                  <div className="col-span-3 flex gap-2">
                                    <button
                                      type="submit"
                                      className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700"
                                    >
                                      💾 Save
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleInlineCancel}
                                      className="bg-gray-500 text-white px-3 py-1 rounded text-xs hover:bg-gray-600"
                                    >
                                      ❌ Cancel
                                    </button>
                                  </div>
                                </form>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </React.Fragment>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-16 text-center">
                      {loading ? (
                        <div className="flex flex-col items-center justify-center space-y-4">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
                          <p className="text-gray-600 font-medium">Loading transporters...</p>
                        </div>
                      ) : (searchTerm || selectedCity) ? (
                        <div className="space-y-4">
                          <span className="text-5xl">🔍</span>
                          <p className="text-xl text-gray-700 font-medium">No transporters found</p>
                          <p className="text-gray-500">Try adjusting your search or filters</p>
                          <button
                            onClick={() => {
                              setSearchTerm('');
                              setSelectedCity('');
                            }}
                            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium"
                          >
                            Clear All Filters
                          </button>
                        </div>
                      ) : cities.length === 0 ? (
                        <div className="space-y-4">
                          <span className="text-5xl">🏙️</span>
                          <p className="text-xl text-gray-700 font-medium">No cities available</p>
                          <p className="text-gray-500">Please add cities first before adding transporters</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <span className="text-5xl">🚛</span>
                          <p className="text-xl text-gray-700 font-medium">No transporters found</p>
                          <p className="text-gray-500">Click &quot;Add Transport&quot; button to get started</p>
                          <button
                            onClick={() => setShowForm(true)}
                            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium"
                          >
                            ➕ Add First Transporter
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransportersComponent;