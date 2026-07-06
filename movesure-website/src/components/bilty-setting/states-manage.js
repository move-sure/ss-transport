'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../app/utils/auth';

const API_URL = 'https://api.movesure.io';

const StatesComponent = () => {
  const { user } = useAuth();
  const [states, setStates] = useState([]);
  const [filteredStates, setFilteredStates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [formData, setFormData] = useState({ state_code: '', state_name: '' });
  const [editingId, setEditingId] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});

  useEffect(() => {
    fetchStates();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [states, searchTerm, sortBy, sortOrder]);

  const applyFilters = () => {
    let result = [...states];
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(
        s =>
          s.state_code?.toLowerCase().includes(lower) ||
          s.state_name?.toLowerCase().includes(lower)
      );
    }
    result.sort((a, b) => {
      const fieldA = sortBy === 'code' ? a.state_code : a.state_name;
      const fieldB = sortBy === 'code' ? b.state_code : b.state_name;
      const cmp = (fieldA || '').localeCompare(fieldB || '');
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    setFilteredStates(result);
  };

  const fetchStates = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/bilty/master/states?page=1&page_size=100`);
      const result = await res.json();
      if (result.status !== 'success') throw new Error(result.message);
      setStates(result.data.rows || []);
    } catch (error) {
      console.error('Error fetching states:', error);
      alert('Error fetching states: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.state_code.trim()) { alert('State code is required'); return; }
    if (!formData.state_name.trim()) { alert('State name is required'); return; }

    try {
      setLoading(true);
      if (editingId) {
        const res = await fetch(`${API_URL}/api/bilty/master/states/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user?.id,
            state_code: formData.state_code.trim().toUpperCase(),
            state_name: formData.state_name.trim()
          }),
        });
        const result = await res.json();
        if (result.status !== 'success') throw new Error(result.message);
        alert('State updated successfully!');
      } else {
        const res = await fetch(`${API_URL}/api/bilty/master/states`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user?.id,
            state_code: formData.state_code.trim().toUpperCase(),
            state_name: formData.state_name.trim()
          }),
        });
        const result = await res.json();
        if (result.status !== 'success') throw new Error(result.message);
        alert('State added successfully!');
      }
      setFormData({ state_code: '', state_name: '' });
      setEditingId(null);
      setExpandedRows({});
      fetchStates();
    } catch (error) {
      console.error('Error saving state:', error);
      alert('Error saving state: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (state) => {
    setFormData({ state_code: state.state_code, state_name: state.state_name });
    setEditingId(state.id);
    setExpandedRows({ [state.id]: true });
  };

  const handleInlineCancel = () => {
    setFormData({ state_code: '', state_name: '' });
    setEditingId(null);
    setExpandedRows({});
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this state?')) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/bilty/master/states/${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.status !== 'success') throw new Error(result.message);
      alert('State deleted successfully!');
      fetchStates();
    } catch (error) {
      console.error('Error deleting state:', error);
      alert('Error deleting state: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="bg-white p-3 rounded-lg">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-bold text-black">States</h2>
        <span className="text-xs text-gray-500">
          {states.length} state{states.length !== 1 ? 's' : ''} (GST-aligned)
        </span>
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
            <button onClick={() => setSearchTerm('')} className="px-2 text-xs text-gray-600 hover:text-gray-800">
              ✖
            </button>
          )}
        </div>

        {!editingId && (
          <form onSubmit={handleSubmit} className="grid grid-cols-5 gap-2">
            <input
              type="text"
              value={formData.state_code}
              onChange={(e) => setFormData({ ...formData, state_code: e.target.value.toUpperCase() })}
              className="px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500 text-black"
              placeholder="Code (e.g. 27)"
              disabled={loading}
              maxLength={5}
            />
            <input
              type="text"
              value={formData.state_name}
              onChange={(e) => setFormData({ ...formData, state_name: e.target.value })}
              className="col-span-3 px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500 text-black"
              placeholder="State Name (e.g. Maharashtra)"
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
      <div className="mb-2 text-xs text-gray-600">
        Total: {states.length} | Showing: {filteredStates.length}
      </div>

      {/* States Table */}
      <div className="overflow-x-auto border rounded">
        <table className="w-full table-auto border-collapse text-xs">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th
                className="border-r px-2 py-2 text-left font-bold text-black cursor-pointer hover:bg-gray-200 w-24"
                onClick={() => toggleSort('code')}
              >
                GST Code {sortBy === 'code' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="border-r px-2 py-2 text-left font-bold text-black cursor-pointer hover:bg-gray-200"
                onClick={() => toggleSort('name')}
              >
                State Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-2 py-2 text-left font-bold text-black w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStates.length > 0 ? filteredStates.map((state) => (
              <React.Fragment key={state.id}>
                <tr className="hover:bg-blue-50">
                  <td className="border-r border-t px-2 py-2 text-black font-medium">
                    {state.state_code}
                  </td>
                  <td className="border-r border-t px-2 py-2 text-black">
                    {state.state_name}
                  </td>
                  <td className="border-t px-2 py-2">
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(state)}
                        className="text-blue-600 hover:text-blue-800 px-1"
                        disabled={loading}
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(state.id)}
                        className="text-red-600 hover:text-red-800 px-1"
                        disabled={loading}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>

                {editingId === state.id && expandedRows[state.id] && (
                  <tr>
                    <td colSpan="3" className="border-t bg-blue-50 px-2 py-2">
                      <form onSubmit={handleSubmit} className="grid grid-cols-6 gap-2">
                        <input
                          type="text"
                          value={formData.state_code}
                          onChange={(e) => setFormData({ ...formData, state_code: e.target.value.toUpperCase() })}
                          className="px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500 text-black"
                          placeholder="Code"
                          disabled={loading}
                          maxLength={5}
                        />
                        <input
                          type="text"
                          value={formData.state_name}
                          onChange={(e) => setFormData({ ...formData, state_name: e.target.value })}
                          className="col-span-3 px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500 text-black"
                          placeholder="State Name"
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
            )) : (
              <tr>
                <td colSpan="3" className="px-2 py-8 text-center text-gray-500 text-xs">
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      Loading...
                    </div>
                  ) : searchTerm ? (
                    <div>
                      <p>No states found</p>
                      <button
                        onClick={() => setSearchTerm('')}
                        className="text-blue-600 hover:text-blue-800 underline mt-1"
                      >
                        Clear search
                      </button>
                    </div>
                  ) : (
                    <p>No states found. Add your first state above.</p>
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

export default StatesComponent;
