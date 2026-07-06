'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../app/utils/auth';

const API_URL = 'https://api.movesure.io';
import {
  searchCities,
  findDuplicateCityNames,
  filterDuplicateCities,
  sortCities,
  exportToCSV,
  validateCityCode,
  validateCityName
} from './cities-search-helper';

const PAGE_SIZE_OPTIONS = [25, 50, 100];

const CitiesComponent = () => {
  const { user } = useAuth();
  const [cities, setCities] = useState([]);
  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [formData, setFormData] = useState({ city_code: '', city_name: '', state_id: '' });
  const [editingId, setEditingId] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => { fetchCities(); fetchStates(); }, []);

  // Reset to page 1 whenever filters/sort change
  useEffect(() => { setCurrentPage(1); }, [searchTerm, showDuplicatesOnly, sortBy, sortOrder]);

  const filteredCities = useMemo(() => {
    let result = cities;
    if (showDuplicatesOnly) result = filterDuplicateCities(result);
    if (searchTerm.trim()) result = searchCities(result, searchTerm);
    return sortCities(result, sortBy, sortOrder);
  }, [cities, searchTerm, showDuplicatesOnly, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredCities.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pagedCities = filteredCities.slice((safePage - 1) * pageSize, safePage * pageSize);

  const fetchCities = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/bilty/master/cities?page=1&page_size=1000`);
      const result = await res.json();
      if (result.status !== 'success') throw new Error(result.message);
      setCities(result.data.rows || []);
    } catch (error) {
      console.error('Error fetching cities:', error);
      alert('Error fetching cities: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStates = async () => {
    try {
      const res = await fetch(`${API_URL}/api/bilty/master/states?page=1&page_size=100`);
      const result = await res.json();
      if (result.status === 'success') setStates(result.data.rows || []);
    } catch (error) {
      console.error('Error fetching states:', error);
    }
  };

  const getStateFields = (stateId) => {
    const st = states.find(s => s.id === stateId);
    return st
      ? { state_id: st.id, state_code: st.state_code, state_name: st.state_name }
      : { state_id: null, state_code: null, state_name: null };
  };

  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    const codeError = validateCityCode(formData.city_code);
    const nameError = validateCityName(formData.city_name);
    if (codeError || nameError) { alert(codeError || nameError); return; }

    const stateFields = formData.state_id
      ? getStateFields(formData.state_id)
      : { state_id: null, state_code: null, state_name: null };

    try {
      setLoading(true);
      if (editingId) {
        const res = await fetch(`${API_URL}/api/bilty/master/cities/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user?.id,
            city_code: formData.city_code.trim().toUpperCase(),
            city_name: formData.city_name.trim(),
            ...stateFields
          }),
        });
        const result = await res.json();
        if (result.status !== 'success') throw new Error(result.message);
        alert('City updated successfully!');
      } else {
        const res = await fetch(`${API_URL}/api/bilty/master/cities`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user?.id,
            city_code: formData.city_code.trim().toUpperCase(),
            city_name: formData.city_name.trim(),
            ...stateFields
          }),
        });
        const result = await res.json();
        if (result.status !== 'success') throw new Error(result.message);
        alert('City added successfully!');
      }
      setFormData({ city_code: '', city_name: '', state_id: '' });
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
    setFormData({ city_code: city.city_code, city_name: city.city_name, state_id: city.state_id || '' });
    setEditingId(city.id);
    setExpandedRows({ [city.id]: true });
  };

  const handleInlineCancel = () => {
    setFormData({ city_code: '', city_name: '', state_id: '' });
    setEditingId(null);
    setExpandedRows({});
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this city?')) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/bilty/master/cities/${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.status !== 'success') throw new Error(result.message);
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
    const data = filteredCities.length > 0 ? filteredCities : cities;
    const count = exportToCSV(data, 'cities');
    if (count) alert(`Exported ${count} cities to CSV`);
  };

  const toggleSort = (field) => {
    if (sortBy === field) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortOrder('asc'); }
  };

  const duplicateNames = findDuplicateCityNames(cities);
  const duplicateCount = filterDuplicateCities(cities).length;

  // Pagination page numbers with ellipsis
  const getPageNumbers = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = [];
    if (safePage <= 4) {
      pages.push(1, 2, 3, 4, 5, '...', totalPages);
    } else if (safePage >= totalPages - 3) {
      pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', safePage - 1, safePage, safePage + 1, '...', totalPages);
    }
    return pages;
  };

  const StateSelect = ({ value, onChange, disabled }) => (
    <select
      value={value}
      onChange={onChange}
      disabled={disabled || states.length === 0}
      className="px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500 text-black bg-white"
    >
      <option value="">— State —</option>
      {states.map(s => (
        <option key={s.id} value={s.id}>{s.state_code} – {s.state_name}</option>
      ))}
    </select>
  );

  return (
    <div className="bg-white p-3 rounded-lg">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-bold text-black">Cities</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowDuplicatesOnly(!showDuplicatesOnly)}
            className={`px-3 py-1 text-xs rounded ${showDuplicatesOnly ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-700'} hover:opacity-80`}
          >
            {showDuplicatesOnly ? `Duplicates (${duplicateCount})` : `Show Duplicates${duplicateCount > 0 ? ` (${duplicateCount})` : ''}`}
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

      {/* Search + Add */}
      <div className="mb-3 bg-gray-50 p-2 rounded">
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-black"
            placeholder="🔍 Search by code, name or state..."
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="px-2 text-xs text-gray-600 hover:text-gray-800">✖</button>
          )}
        </div>

        {!editingId && (
          <div className="grid grid-cols-6 gap-2">
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
              className="col-span-2 px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500 text-black"
              placeholder="City Name"
              disabled={loading}
              maxLength={100}
            />
            <StateSelect
              value={formData.state_id}
              onChange={(e) => setFormData({ ...formData, state_id: e.target.value })}
              disabled={loading}
            />
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="col-span-2 bg-blue-500 text-white px-2 py-1 text-xs rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? '...' : 'Add City'}
            </button>
          </div>
        )}
      </div>

      {/* Stats + per-page */}
      <div className="mb-2 text-xs text-gray-600 flex items-center justify-between">
        <span>
          Total: {cities.length} | Filtered: {filteredCities.length} |
          Page {safePage} of {totalPages}
        </span>
        <div className="flex items-center gap-2">
          {duplicateCount > 0 && (
            <span className="text-orange-600">⚠️ {duplicateCount} duplicates</span>
          )}
          <span className="text-gray-500">Rows:</span>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
            className="px-1 py-0.5 border rounded text-xs text-black bg-white"
          >
            {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border rounded">
        <table className="w-full table-auto border-collapse text-xs">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th
                className="border-r px-2 py-2 text-left font-bold text-black cursor-pointer hover:bg-gray-200 w-20"
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
              <th className="border-r px-2 py-2 text-left font-bold text-black w-44">State</th>
              <th className="px-2 py-2 text-left font-bold text-black w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedCities.length > 0 ? pagedCities.map((city) => {
              const isDuplicate = duplicateNames.has(city.city_name?.toLowerCase().trim());
              return (
                <React.Fragment key={city.id}>
                  <tr className={`hover:bg-blue-50 ${isDuplicate ? 'bg-orange-50' : ''}`}>
                    <td className="border-r border-t px-2 py-2 text-black font-medium">{city.city_code}</td>
                    <td className="border-r border-t px-2 py-2 text-black">
                      {city.city_name}
                      {isDuplicate && <span className="ml-2 text-orange-600">⚠️</span>}
                    </td>
                    <td className="border-r border-t px-2 py-2 text-black">
                      {city.state_name ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                            {city.state_code}
                          </span>
                          <span className="text-gray-700">{city.state_name}</span>
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">Not set</span>
                      )}
                    </td>
                    <td className="border-t px-2 py-2">
                      <div className="flex gap-1">
                        <button onClick={() => handleEdit(city)} className="text-blue-600 hover:text-blue-800 px-1" disabled={loading} title="Edit">✏️</button>
                        <button onClick={() => handleDelete(city.id)} className="text-red-600 hover:text-red-800 px-1" disabled={loading} title="Delete">🗑️</button>
                      </div>
                    </td>
                  </tr>

                  {editingId === city.id && expandedRows[city.id] && (
                    <tr>
                      <td colSpan="4" className="border-t bg-blue-50 px-2 py-2">
                        <div className="grid grid-cols-7 gap-2">
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
                            className="col-span-2 px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500 text-black"
                            placeholder="City Name"
                            disabled={loading}
                            maxLength={100}
                          />
                          <StateSelect
                            value={formData.state_id}
                            onChange={(e) => setFormData({ ...formData, state_id: e.target.value })}
                            disabled={loading}
                          />
                          <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="bg-green-500 text-white px-2 py-1 text-xs rounded hover:bg-green-600 disabled:opacity-50"
                          >
                            {loading ? '...' : 'Save'}
                          </button>
                          <button
                            type="button"
                            onClick={handleInlineCancel}
                            className="col-span-2 bg-gray-500 text-white px-2 py-1 text-xs rounded hover:bg-gray-600"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            }) : (
              <tr>
                <td colSpan="4" className="px-2 py-8 text-center text-gray-500 text-xs">
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            Showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filteredCities.length)} of {filteredCities.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={safePage === 1}
              className="px-2 py-1 text-xs border rounded disabled:opacity-40 hover:bg-gray-100 text-black"
            >
              «
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="px-2 py-1 text-xs border rounded disabled:opacity-40 hover:bg-gray-100 text-black"
            >
              ‹
            </button>
            {getPageNumbers().map((page, i) =>
              page === '...' ? (
                <span key={`ellipsis-${i}`} className="px-2 py-1 text-xs text-gray-400">…</span>
              ) : (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-2.5 py-1 text-xs border rounded font-medium ${
                    safePage === page
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'hover:bg-gray-100 text-black'
                  }`}
                >
                  {page}
                </button>
              )
            )}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="px-2 py-1 text-xs border rounded disabled:opacity-40 hover:bg-gray-100 text-black"
            >
              ›
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={safePage === totalPages}
              className="px-2 py-1 text-xs border rounded disabled:opacity-40 hover:bg-gray-100 text-black"
            >
              »
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CitiesComponent;
