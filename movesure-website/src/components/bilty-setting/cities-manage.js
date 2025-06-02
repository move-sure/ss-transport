'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../app/utils/auth';
import supabase from '../../app/utils/supabase';

const CitiesComponent = () => {
  const { user } = useAuth();
  const [cities, setCities] = useState([]);
  const [filteredCities, setFilteredCities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    city_code: '',
    city_name: ''
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchCities();
  }, []);

  useEffect(() => {
    filterCities();
  }, [cities, searchTerm]);

  const filterCities = () => {
    if (!searchTerm.trim()) {
      setFilteredCities(cities);
      return;
    }

    const filtered = cities.filter(city => {
      const searchLower = searchTerm.toLowerCase();
      return (
        city.city_code?.toLowerCase().includes(searchLower) ||
        city.city_name?.toLowerCase().includes(searchLower)
      );
    });

    setFilteredCities(filtered);
  };

  const fetchCities = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cities')
        .select('*')
        .order('city_name');

      if (error) throw error;
      setCities(data || []);
    } catch (error) {
      console.error('Error fetching cities:', error);
      alert('Error fetching cities: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.city_code.trim() || !formData.city_name.trim()) {
      alert('Please fill all required fields');
      return;
    }

    try {
      setLoading(true);

      if (editingId) {
        // Update existing city
        const { error } = await supabase
          .from('cities')
          .update({
            city_code: formData.city_code.trim().toUpperCase(),
            city_name: formData.city_name.trim()
          })
          .eq('id', editingId);

        if (error) throw error;
        alert('City updated successfully!');
      } else {
        // Add new city
        const { error } = await supabase
          .from('cities')
          .insert([{
            city_code: formData.city_code.trim().toUpperCase(),
            city_name: formData.city_name.trim()
          }]);

        if (error) throw error;
        alert('City added successfully!');
      }

      setFormData({ city_code: '', city_name: '' });
      setEditingId(null);
      fetchCities();
    } catch (error) {
      console.error('Error saving city:', error);
      alert('Error saving city: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (city) => {
    setFormData({
      city_code: city.city_code,
      city_name: city.city_name
    });
    setEditingId(city.id);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this city?')) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('cities')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('City deleted successfully!');
      fetchCities();
    } catch (error) {
      console.error('Error deleting city:', error);
      alert('Error deleting city: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setFormData({ city_code: '', city_name: '' });
    setEditingId(null);
  };

  const downloadCSV = () => {
    const dataToExport = searchTerm && filteredCities.length > 0 ? filteredCities : cities;
    
    if (dataToExport.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = ['City Code', 'City Name'];
    const csvContent = [
      headers.join(','),
      ...dataToExport.map(city => [
        `"${city.city_code || ''}"`,
        `"${city.city_name || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `cities_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alert(`Exported ${dataToExport.length} cities to CSV`);
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-black">Manage Cities</h2>
        <button
          onClick={downloadCSV}
          disabled={cities.length === 0}
          className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          📥 Export CSV
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black pl-10"
            placeholder="🔍 Search cities by code or name..."
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
      <form onSubmit={handleSubmit} className="mb-8 bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-black mb-4">
          {editingId ? 'Edit City' : 'Add New City'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              City Code *
            </label>
            <input
              type="text"
              value={formData.city_code}
              onChange={(e) => setFormData({ ...formData, city_code: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="Enter city code (e.g., NYC)"
              disabled={loading}
              required
              maxLength={10}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              City Name *
            </label>
            <input
              type="text"
              value={formData.city_name}
              onChange={(e) => setFormData({ ...formData, city_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="Enter city name"
              disabled={loading}
              required
              maxLength={100}
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? '⏳ Saving...' : editingId ? '✏️ Update City' : '➕ Add City'}
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
          <span className="font-medium">Total Cities: {cities.length}</span>
          {searchTerm && (
            <span className="ml-4 text-blue-600">
              Filtered: {filteredCities.length} of {cities.length}
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

      {/* Cities List */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full table-auto border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="border-r px-6 py-3 text-left font-bold text-black">City Code</th>
              <th className="border-r px-6 py-3 text-left font-bold text-black">City Name</th>
              <th className="px-6 py-3 text-left font-bold text-black">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCities.length > 0 ? filteredCities.map((city, index) => (
              <tr key={city.id} className={`hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                <td className="border-r px-6 py-4 text-black font-medium">{city.city_code}</td>
                <td className="border-r px-6 py-4 text-black">{city.city_name}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleEdit(city)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 rounded border border-blue-200 hover:bg-blue-50 transition-colors"
                      disabled={loading}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDelete(city.id)}
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
                <td colSpan="3" className="px-6 py-12 text-center text-gray-500">
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                      Loading cities...
                    </div>
                  ) : searchTerm ? (
                    <div>
                      <p className="text-lg mb-2">🔍 No cities found matching {searchTerm}</p>
                      <button
                        onClick={clearSearch}
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        Clear search to see all cities
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-lg mb-2">🏙️ No cities found</p>
                      <p className="text-sm">Add your first city using the form above</p>
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

export default CitiesComponent;