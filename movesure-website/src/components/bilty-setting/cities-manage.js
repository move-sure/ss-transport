'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../app/utils/auth';
import supabase from '../../app/utils/supabase';
import { 
  searchCities, 
  findDuplicateCityNames, 
  filterDuplicateCities, 
  sortCities, 
  exportToCSV,
  validateCityCode,
  validateCityName
} from './cities-search-helper';

const CitiesComponent = () => {
  const { user } = useAuth();
  const [cities, setCities] = useState([]);
  const [filteredCities, setFilteredCities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [formData, setFormData] = useState({
    city_code: '',
    city_name: ''
  });
  const [editingId, setEditingId] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});

  useEffect(() => {
    fetchCities();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [cities, searchTerm, showDuplicatesOnly, sortBy, sortOrder]);

  const applyFilters = () => {
    let result = cities;
    
    // Apply duplicate filter
    if (showDuplicatesOnly) {
      result = filterDuplicateCities(result);
    }
    
    // Apply search filter
    if (searchTerm.trim()) {
      result = searchCities(result, searchTerm);
    }
    
    // Apply sorting
    result = sortCities(result, sortBy, sortOrder);
    
    setFilteredCities(result);
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
    
    const codeError = validateCityCode(formData.city_code);
    const nameError = validateCityName(formData.city_name);
    
    if (codeError || nameError) {
      alert(codeError || nameError);
      return;
    }

    try {
      setLoading(true);

      if (editingId) {
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
      setExpandedRows({});
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
    setExpandedRows({ [city.id]: true });
  };
  
  const handleInlineCancel = () => {
    setFormData({ city_code: '', city_name: '' });
    setEditingId(null);
    setExpandedRows({});
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

  const downloadCSV = () => {
    const dataToExport = filteredCities.length > 0 ? filteredCities : cities;
    const count = exportToCSV(dataToExport, 'cities');
    if (count) alert(`Exported ${count} cities to CSV`);
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const duplicateNames = findDuplicateCityNames(cities);
  const duplicateCount = filterDuplicateCities(cities).length;

  return (
    <div className="bg-white p-3 rounded-lg">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-bold text-black">Cities</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowDuplicatesOnly(!showDuplicatesOnly)}
            className={`px-3 py-1 text-xs rounded ${showDuplicatesOnly ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-700'} hover:opacity-80`}
          >
            {showDuplicatesOnly ? `Duplicates (${duplicateCount})` : `Show Duplicates ${duplicateCount > 0 ? `(${duplicateCount})` : ''}`}
          </button>
          <button
            onClick={downloadCSV}
            disabled={cities.length === 0}
            className="bg-green-500 text-white px-3 py-1 text-xs rounded hover:bg-green-600 disabled:opacity-50"
          >
            Export
          </button>
        </div>
      </div>

      {/* Search and Add Form */}
      <div className="mb-3 bg-gray-50 p-2 rounded">
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-black"
            placeholder="🔍 Search by code or name..."
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="px-2 text-xs text-gray-600 hover:text-gray-800"
            >
              ✖
            </button>
          )}
        </div>
        
        {!editingId && (
          <form onSubmit={handleSubmit} className="grid grid-cols-5 gap-2">
            <input
              type="text"
              value={formData.city_code}
              onChange={(e) => setFormData({ ...formData, city_code: e.target.value.toUpperCase() })}
              className="px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500 text-black"
              placeholder="Code"
              disabled={loading}
              maxLength={10}
            />
            <input
              type="text"
              value={formData.city_name}
              onChange={(e) => setFormData({ ...formData, city_name: e.target.value })}
              className="col-span-3 px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500 text-black"
              placeholder="City Name"
              disabled={loading}
              maxLength={100}
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-500 text-white px-2 py-1 text-xs rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? '...' : 'Add'}
            </button>
          </form>
        )}
      </div>

      {/* Stats */}
      <div className="mb-2 text-xs text-gray-600 flex justify-between">
        <span>Total: {cities.length} | Showing: {filteredCities.length}</span>
        {duplicateCount > 0 && (
          <span className="text-orange-600">⚠️ {duplicateCount} duplicates found</span>
        )}
      </div>

      {/* Cities Table */}
      <div className="overflow-x-auto border rounded">
        <table className="w-full table-auto border-collapse text-xs">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th 
                className="border-r px-2 py-2 text-left font-bold text-black cursor-pointer hover:bg-gray-200"
                onClick={() => toggleSort('code')}
              >
                Code {sortBy === 'code' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="border-r px-2 py-2 text-left font-bold text-black cursor-pointer hover:bg-gray-200"
                onClick={() => toggleSort('name')}
              >
                City Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-2 py-2 text-left font-bold text-black w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCities.length > 0 ? filteredCities.map((city) => {
              const isDuplicate = duplicateNames.has(city.city_name?.toLowerCase().trim());
              return (
                <React.Fragment key={city.id}>
                  <tr className={`hover:bg-blue-50 ${isDuplicate ? 'bg-orange-50' : ''}`}>
                    <td className="border-r border-t px-2 py-2 text-black font-medium">
                      {city.city_code}
                    </td>
                    <td className="border-r border-t px-2 py-2 text-black">
                      {city.city_name}
                      {isDuplicate && <span className="ml-2 text-orange-600">⚠️</span>}
                    </td>
                    <td className="border-t px-2 py-2">
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEdit(city)}
                          className="text-blue-600 hover:text-blue-800 px-1"
                          disabled={loading}
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(city.id)}
                          className="text-red-600 hover:text-red-800 px-1"
                          disabled={loading}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                  
                  {editingId === city.id && expandedRows[city.id] && (
                    <tr>
                      <td colSpan="3" className="border-t bg-blue-50 px-2 py-2">
                        <form onSubmit={handleSubmit} className="grid grid-cols-6 gap-2">
                          <input
                            type="text"
                            value={formData.city_code}
                            onChange={(e) => setFormData({ ...formData, city_code: e.target.value.toUpperCase() })}
                            className="px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500 text-black"
                            placeholder="Code"
                            disabled={loading}
                            maxLength={10}
                          />
                          <input
                            type="text"
                            value={formData.city_name}
                            onChange={(e) => setFormData({ ...formData, city_name: e.target.value })}
                            className="col-span-3 px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500 text-black"
                            placeholder="City Name"
                            disabled={loading}
                            maxLength={100}
                          />
                          <button
                            type="submit"
                            disabled={loading}
                            className="bg-green-500 text-white px-2 py-1 text-xs rounded hover:bg-green-600 disabled:opacity-50"
                          >
                            {loading ? '...' : 'Save'}
                          </button>
                          <button
                            type="button"
                            onClick={handleInlineCancel}
                            className="bg-gray-500 text-white px-2 py-1 text-xs rounded hover:bg-gray-600"
                          >
                            Cancel
                          </button>
                        </form>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            }) : (
              <tr>
                <td colSpan="3" className="px-2 py-8 text-center text-gray-500 text-xs">
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      Loading...
                    </div>
                  ) : searchTerm || showDuplicatesOnly ? (
                    <div>
                      <p>No cities found</p>
                      <button
                        onClick={() => { setSearchTerm(''); setShowDuplicatesOnly(false); }}
                        className="text-blue-600 hover:text-blue-800 underline mt-1"
                      >
                        Clear filters
                      </button>
                    </div>
                  ) : (
                    <p>No cities found. Add your first city above.</p>
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