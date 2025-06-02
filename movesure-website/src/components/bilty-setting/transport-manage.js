'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../app/utils/auth';
import supabase from '../../app/utils/supabase';

const TransportersComponent = () => {
  const { user } = useAuth();
  const [transporters, setTransporters] = useState([]);
  const [filteredTransporters, setFilteredTransporters] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
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

  useEffect(() => {
    fetchCities();
    fetchTransporters();
  }, []);

  useEffect(() => {
    filterTransporters();
  }, [transporters, searchTerm]);

  const filterTransporters = () => {
    if (!searchTerm.trim()) {
      setFilteredTransporters(transporters);
      return;
    }

    const filtered = transporters.filter(transporter => {
      const searchLower = searchTerm.toLowerCase();
      return (
        transporter.transport_name?.toLowerCase().includes(searchLower) ||
        transporter.city_name?.toLowerCase().includes(searchLower) ||
        transporter.cities?.city_name?.toLowerCase().includes(searchLower) ||
        transporter.address?.toLowerCase().includes(searchLower) ||
        transporter.gst_number?.toLowerCase().includes(searchLower) ||
        transporter.mob_number?.toLowerCase().includes(searchLower) ||
        transporter.branch_owner_name?.toLowerCase().includes(searchLower)
      );
    });

    setFilteredTransporters(filtered);
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
  };

  const downloadCSV = () => {
    const dataToExport = searchTerm && filteredTransporters.length > 0 ? filteredTransporters : transporters;
    
    if (dataToExport.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = ['Transport Name', 'City', 'Address', 'GST Number', 'Mobile', 'Owner Name', 'Website'];
    const csvContent = [
      headers.join(','),
      ...dataToExport.map(transporter => [
        `"${transporter.transport_name || ''}"`,
        `"${transporter.cities?.city_name || transporter.city_name || ''}"`,
        `"${transporter.address || ''}"`,
        `"${transporter.gst_number || ''}"`,
        `"${transporter.mob_number || ''}"`,
        `"${transporter.branch_owner_name || ''}"`,
        `"${transporter.website || ''}"`
      ].join(','))
    ].join('\n');

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

  const clearSearch = () => {
    setSearchTerm('');
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-black">Manage Transporters</h2>
        <button
          onClick={downloadCSV}
          disabled={transporters.length === 0}
          className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          📥 Export CSV
        </button>
      </div>

      {cities.length === 0 && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded-lg mb-6 flex items-center">
          <span className="mr-2">⚠️</span>
          <span className="font-medium">Please add cities first before adding transporters.</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black pl-10"
            placeholder="🔍 Search transporters by name, city, address, GST, mobile, or owner..."
          />
          {searchTerm && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ✖
            </button>
          )}
        </div>
      </div>

      {/* Add/Edit Form */}
      <form onSubmit={handleSubmit} className="mb-8 bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-black mb-4">
          {editingId ? '✏️ Edit Transporter' : '➕ Add New Transporter'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Transport Name *
            </label>
            <input
              type="text"
              value={formData.transport_name}
              onChange={(e) => setFormData({ ...formData, transport_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="Enter transport company name"
              disabled={loading}
              required
              maxLength={100}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              City *
            </label>
            <select
              value={formData.city_id}
              onChange={(e) => handleCityChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
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

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-black mb-2">
              Address *
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="Enter complete address"
              rows="3"
              disabled={loading}
              required
              maxLength={500}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-2">
              GST Number
            </label>
            <input
              type="text"
              value={formData.gst_number}
              onChange={(e) => setFormData({ ...formData, gst_number: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="Enter GST number"
              disabled={loading}
              maxLength={15}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Mobile Number
            </label>
            <input
              type="tel"
              value={formData.mob_number}
              onChange={(e) => setFormData({ ...formData, mob_number: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="Enter mobile number"
              disabled={loading}
              maxLength={15}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Branch Owner Name
            </label>
            <input
              type="text"
              value={formData.branch_owner_name}
              onChange={(e) => setFormData({ ...formData, branch_owner_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="Enter branch owner name"
              disabled={loading}
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Website
            </label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="https://example.com"
              disabled={loading}
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading || cities.length === 0}
            className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? '⏳ Saving...' : editingId ? '✏️ Update Transporter' : '➕ Add Transporter'}
          </button>
          
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600 font-medium"
            >
              ❌ Cancel
            </button>
          )}
        </div>
      </form>

      {/* Statistics */}
      <div className="mb-4 flex justify-between items-center">
        <div className="text-sm text-black">
          <span className="font-medium">Total Transporters: {transporters.length}</span>
          {searchTerm && (
            <span className="ml-4 text-blue-600">
              Filtered: {filteredTransporters.length} of {transporters.length}
            </span>
          )}
        </div>
        {searchTerm && (
          <button
            onClick={clearSearch}
            className="text-blue-600 hover:text-blue-800 text-sm underline"
          >
            Clear Search
          </button>
        )}
      </div>

      {/* Transporters List */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full table-auto border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="border-r px-4 py-3 text-left font-bold text-black">Transport Name</th>
              <th className="border-r px-4 py-3 text-left font-bold text-black">City</th>
              <th className="border-r px-4 py-3 text-left font-bold text-black">Address</th>
              <th className="border-r px-4 py-3 text-left font-bold text-black">GST Number</th>
              <th className="border-r px-4 py-3 text-left font-bold text-black">Mobile</th>
              <th className="border-r px-4 py-3 text-left font-bold text-black">Owner</th>
              <th className="px-4 py-3 text-left font-bold text-black">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransporters.length > 0 ? filteredTransporters.map((transporter, index) => (
              <tr key={transporter.id} className={`hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                <td className="border-r px-4 py-3 text-black font-medium">{transporter.transport_name}</td>
                <td className="border-r px-4 py-3 text-black">
                  {transporter.cities ? transporter.cities.city_name : transporter.city_name}
                </td>
                <td className="border-r px-4 py-3 text-black text-sm">
                  {transporter.address.length > 50 
                    ? transporter.address.substring(0, 50) + '...'
                    : transporter.address
                  }
                </td>
                <td className="border-r px-4 py-3 text-black">{transporter.gst_number || '-'}</td>
                <td className="border-r px-4 py-3 text-black">{transporter.mob_number || '-'}</td>
                <td className="border-r px-4 py-3 text-black">{transporter.branch_owner_name || '-'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(transporter)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 rounded border border-blue-200 hover:bg-blue-50 transition-colors"
                      disabled={loading}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDelete(transporter.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium px-3 py-1 rounded border border-red-200 hover:bg-red-50 transition-colors"
                      disabled={loading}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                      Loading transporters...
                    </div>
                  ) : searchTerm ? (
                    <div>
                      <p className="text-lg mb-2">🔍 No transporters found matching {searchTerm}</p>
                      <button
                        onClick={clearSearch}
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        Clear search to see all transporters
                      </button>
                    </div>
                  ) : cities.length === 0 ? (
                    <div>
                      <p className="text-lg mb-2">🏙️ No cities available</p>
                      <p className="text-sm">Please add cities first before adding transporters</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-lg mb-2">🚛 No transporters found</p>
                      <p className="text-sm">Add your first transporter using the form above</p>
                    </div>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransportersComponent;