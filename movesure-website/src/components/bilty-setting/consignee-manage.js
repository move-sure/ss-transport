'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../app/utils/auth';
import supabase from '../../app/utils/supabase';

const ConsigneeComponent = () => {
  const { user } = useAuth();
  const [consignees, setConsignees] = useState([]);
  const [filteredConsignees, setFilteredConsignees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, with_gst, without_gst
  const [formData, setFormData] = useState({
    company_name: '',
    company_add: '',
    number: '',
    gst_num: '',
    adhar: '',
    pan: ''
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchConsignees();
  }, []);

  useEffect(() => {
    filterConsignees();
  }, [consignees, searchTerm, filterType]);

  const filterConsignees = () => {
    let filtered = consignees;

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(consignee => 
        consignee.company_name?.toLowerCase().includes(searchLower) ||
        consignee.company_add?.toLowerCase().includes(searchLower) ||
        consignee.number?.toLowerCase().includes(searchLower) ||
        consignee.gst_num?.toLowerCase().includes(searchLower) ||
        consignee.adhar?.toLowerCase().includes(searchLower) ||
        consignee.pan?.toLowerCase().includes(searchLower)
      );
    }

    // Apply type filter
    if (filterType === 'with_gst') {
      filtered = filtered.filter(consignee => consignee.gst_num && consignee.gst_num.trim());
    } else if (filterType === 'without_gst') {
      filtered = filtered.filter(consignee => !consignee.gst_num || !consignee.gst_num.trim());
    }

    setFilteredConsignees(filtered);
  };

  const fetchConsignees = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('consignees')
        .select('*')
        .order('company_name');

      if (error) throw error;
      setConsignees(data || []);
    } catch (error) {
      console.error('Error fetching consignees:', error);
      alert('Error fetching consignees: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.company_name.trim() || !formData.company_add.trim()) {
      alert('Please fill all required fields');
      return;
    }

    try {
      setLoading(true);

      const consigneeData = {
        company_name: formData.company_name.trim(),
        company_add: formData.company_add.trim(),
        number: formData.number.trim() || null,
        gst_num: formData.gst_num.trim().toUpperCase() || null,
        adhar: formData.adhar.trim() || null,
        pan: formData.pan.trim().toUpperCase() || null
      };

      if (editingId) {
        const { error } = await supabase
          .from('consignees')
          .update(consigneeData)
          .eq('id', editingId);

        if (error) throw error;
        alert('Consignee updated successfully!');
      } else {
        const { error } = await supabase
          .from('consignees')
          .insert([consigneeData]);

        if (error) throw error;
        alert('Consignee added successfully!');
      }

      setFormData({
        company_name: '',
        company_add: '',
        number: '',
        gst_num: '',
        adhar: '',
        pan: ''
      });
      setEditingId(null);
      fetchConsignees();
    } catch (error) {
      console.error('Error saving consignee:', error);
      alert('Error saving consignee: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (consignee) => {
    setFormData({
      company_name: consignee.company_name,
      company_add: consignee.company_add,
      number: consignee.number || '',
      gst_num: consignee.gst_num || '',
      adhar: consignee.adhar || '',
      pan: consignee.pan || ''
    });
    setEditingId(consignee.id);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this consignee?')) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('consignees')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('Consignee deleted successfully!');
      fetchConsignees();
    } catch (error) {
      console.error('Error deleting consignee:', error);
      alert('Error deleting consignee: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setFormData({
      company_name: '',
      company_add: '',
      number: '',
      gst_num: '',
      adhar: '',
      pan: ''
    });
    setEditingId(null);
  };

  const downloadCSV = () => {
    const dataToExport = searchTerm || filterType !== 'all' ? filteredConsignees : consignees;
    
    if (dataToExport.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = ['Company Name', 'Address', 'Mobile', 'GST Number', 'Aadhar', 'PAN'];
    const csvContent = [
      headers.join(','),
      ...dataToExport.map(consignee => [
        `"${consignee.company_name || ''}"`,
        `"${consignee.company_add || ''}"`,
        `"${consignee.number || ''}"`,
        `"${consignee.gst_num || ''}"`,
        `"${consignee.adhar || ''}"`,
        `"${consignee.pan || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `consignees_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alert(`Exported ${dataToExport.length} consignees to CSV`);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterType('all');
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-black">Manage Consignees</h2>
        <button
          onClick={downloadCSV}
          disabled={consignees.length === 0}
          className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          📥 Export CSV
        </button>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black pl-10"
            placeholder="🔍 Search consignees by name, address, mobile, GST, Aadhar, or PAN..."
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ✖
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-black">Filter by:</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
            >
              <option value="all">All Consignees</option>
              <option value="with_gst">With GST</option>
              <option value="without_gst">Without GST</option>
            </select>
          </div>
          
          {(searchTerm || filterType !== 'all') && (
            <button
              onClick={clearFilters}
              className="text-blue-600 hover:text-blue-800 text-sm underline"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Add/Edit Form */}
      <form onSubmit={handleSubmit} className="mb-8 bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-black mb-4">
          {editingId ? '✏️ Edit Consignee' : '➕ Add New Consignee'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Company Name *
            </label>
            <input
              type="text"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="Enter company name"
              disabled={loading}
              required
              maxLength={200}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Mobile Number
            </label>
            <input
              type="tel"
              value={formData.number}
              onChange={(e) => setFormData({ ...formData, number: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="Enter mobile number"
              disabled={loading}
              maxLength={15}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-black mb-2">
              Company Address *
            </label>
            <textarea
              value={formData.company_add}
              onChange={(e) => setFormData({ ...formData, company_add: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="Enter complete company address"
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
              value={formData.gst_num}
              onChange={(e) => setFormData({ ...formData, gst_num: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="Enter GST number"
              disabled={loading}
              maxLength={15}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Aadhar Number
            </label>
            <input
              type="text"
              value={formData.adhar}
              onChange={(e) => setFormData({ ...formData, adhar: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="Enter Aadhar number"
              disabled={loading}
              maxLength={12}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-2">
              PAN Number
            </label>
            <input
              type="text"
              value={formData.pan}
              onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="Enter PAN number"
              disabled={loading}
              maxLength={10}
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? '⏳ Saving...' : editingId ? '✏️ Update Consignee' : '➕ Add Consignee'}
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
        <div className="text-sm text-black space-x-4">
          <span className="font-medium">Total: {consignees.length}</span>
          <span className="text-green-600">With GST: {consignees.filter(c => c.gst_num).length}</span>
          <span className="text-orange-600">Without GST: {consignees.filter(c => !c.gst_num).length}</span>
          {(searchTerm || filterType !== 'all') && (
            <span className="text-blue-600">Filtered: {filteredConsignees.length}</span>
          )}
        </div>
      </div>

      {/* Consignees List */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full table-auto border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="border-r px-4 py-3 text-left font-bold text-black">Company Name</th>
              <th className="border-r px-4 py-3 text-left font-bold text-black">Address</th>
              <th className="border-r px-4 py-3 text-left font-bold text-black">Mobile</th>
              <th className="border-r px-4 py-3 text-left font-bold text-black">GST Number</th>
              <th className="border-r px-4 py-3 text-left font-bold text-black">PAN</th>
              <th className="px-4 py-3 text-left font-bold text-black">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredConsignees.length > 0 ? filteredConsignees.map((consignee, index) => (
              <tr key={consignee.id} className={`hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                <td className="border-r px-4 py-3 text-black font-medium">{consignee.company_name}</td>
                <td className="border-r px-4 py-3 text-black text-sm">
                  {consignee.company_add.length > 50 
                    ? consignee.company_add.substring(0, 50) + '...'
                    : consignee.company_add
                  }
                </td>
                <td className="border-r px-4 py-3 text-black">{consignee.number || '-'}</td>
                <td className="border-r px-4 py-3 text-black">
                  {consignee.gst_num ? (
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                      {consignee.gst_num}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="border-r px-4 py-3 text-black">{consignee.pan || '-'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(consignee)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 rounded border border-blue-200 hover:bg-blue-50 transition-colors"
                      disabled={loading}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDelete(consignee.id)}
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
                <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                      Loading consignees...
                    </div>
                  ) : searchTerm || filterType !== 'all' ? (
                    <div>
                      <p className="text-lg mb-2">🔍 No consignees found matching your filters</p>
                      <button
                        onClick={clearFilters}
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        Clear filters to see all consignees
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-lg mb-2">🏢 No consignees found</p>
                      <p className="text-sm">Add your first consignee using the form above</p>
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

export default ConsigneeComponent;