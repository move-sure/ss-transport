'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../app/utils/auth';
import supabase from '../../app/utils/supabase';

const ConsignorComponent = () => {
  const { user } = useAuth();
  const [consignors, setConsignors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, with_gst, without_gst
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [formData, setFormData] = useState({
    company_name: '',
    company_add: '',
    number: '',
    gst_num: '',
    adhar: '',
    pan: ''
  });
  const [editingId, setEditingId] = useState(null);

  const ITEMS_PER_PAGE = 50;
  useEffect(() => {
    fetchConsignors(true); // Reset on mount
  }, []);

  useEffect(() => {
    // Reset and fetch when search or filter changes
    setConsignors([]);
    setCurrentPage(0);
    setHasMore(true);
    fetchConsignors(true);
  }, [searchTerm, filterType]);

  const buildQuery = () => {
    let query = supabase.from('consignors').select('*', { count: 'exact' });

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      query = query.or(
        `company_name.ilike.%${searchLower}%,` +
        `company_add.ilike.%${searchLower}%,` +
        `number.ilike.%${searchLower}%,` +
        `gst_num.ilike.%${searchLower}%,` +
        `adhar.ilike.%${searchLower}%,` +
        `pan.ilike.%${searchLower}%`
      );
    }

    // Apply type filter
    if (filterType === 'with_gst') {
      query = query.not('gst_num', 'is', null).neq('gst_num', '');
    } else if (filterType === 'without_gst') {
      query = query.or('gst_num.is.null,gst_num.eq.');
    }

    return query.order('company_name');
  };

  const fetchConsignors = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setCurrentPage(0);
      } else {
        setLoadingMore(true);
      }

      const page = reset ? 0 : currentPage;
      const query = buildQuery()
        .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      if (reset) {
        setConsignors(data || []);
        setTotalCount(count || 0);
      } else {
        setConsignors(prev => [...prev, ...(data || [])]);
      }

      // Check if there are more items to load
      setHasMore((data || []).length === ITEMS_PER_PAGE);
      setCurrentPage(page + 1);

    } catch (error) {
      console.error('Error fetching consignors:', error);
      alert('Error fetching consignors: ' + error.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchConsignors(false);
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

      const consignorData = {
        company_name: formData.company_name.trim(),
        company_add: formData.company_add.trim(),
        number: formData.number.trim() || null,
        gst_num: formData.gst_num.trim().toUpperCase() || null,
        adhar: formData.adhar.trim() || null,
        pan: formData.pan.trim().toUpperCase() || null
      };

      if (editingId) {
        const { error } = await supabase
          .from('consignors')
          .update(consignorData)
          .eq('id', editingId);

        if (error) throw error;
        alert('Consignor updated successfully!');
      } else {
        const { error } = await supabase
          .from('consignors')
          .insert([consignorData]);

        if (error) throw error;
        alert('Consignor added successfully!');
      }

      setFormData({
        company_name: '',
        company_add: '',
        number: '',
        gst_num: '',
        adhar: '',
        pan: ''
      });      setEditingId(null);
      fetchConsignors(true); // Reset and reload from beginning
    } catch (error) {
      console.error('Error saving consignor:', error);
      alert('Error saving consignor: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (consignor) => {
    setFormData({
      company_name: consignor.company_name,
      company_add: consignor.company_add,
      number: consignor.number || '',
      gst_num: consignor.gst_num || '',
      adhar: consignor.adhar || '',
      pan: consignor.pan || ''
    });
    setEditingId(consignor.id);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this consignor?')) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('consignors')
        .delete()
        .eq('id', id);      if (error) throw error;
      alert('Consignor deleted successfully!');
      fetchConsignors(true); // Reset and reload from beginning
    } catch (error) {
      console.error('Error deleting consignor:', error);
      alert('Error deleting consignor: ' + error.message);
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
  const downloadCSV = async () => {
    try {
      setLoading(true);
      
      // Get all data for export (not just loaded data)
      const query = buildQuery();
      const { data, error } = await query;
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        alert('No data to export');
        return;
      }

      const headers = ['Company Name', 'Address', 'Mobile', 'GST Number', 'Aadhar', 'PAN'];
      const csvContent = [
        headers.join(','),
        ...data.map(consignor => [
          `"${consignor.company_name || ''}"`,
          `"${consignor.company_add || ''}"`,
          `"${consignor.number || ''}"`,
          `"${consignor.gst_num || ''}"`,
          `"${consignor.adhar || ''}"`,
          `"${consignor.pan || ''}"`
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `consignors_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      alert(`Exported ${data.length} consignors to CSV`);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Error exporting CSV: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterType('all');
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-black">Manage Consignors</h2>
        <button
          onClick={downloadCSV}
          disabled={loading || totalCount === 0}
          className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          📥 Export CSV ({totalCount} total)
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
            placeholder="🔍 Search consignors by name, address, mobile, GST, Aadhar, or PAN..."
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
              <option value="all">All Consignors</option>
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
          {editingId ? '✏️ Edit Consignor' : '➕ Add New Consignor'}
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
            {loading ? '⏳ Saving...' : editingId ? '✏️ Update Consignor' : '➕ Add Consignor'}
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
      </form>      {/* Statistics */}
      <div className="mb-4 flex justify-between items-center">
        <div className="text-sm text-black space-x-4">
          <span className="font-medium">
            Total: {totalCount} 
            {consignors.length < totalCount && ` (Showing ${consignors.length})`}
          </span>
          {(searchTerm || filterType !== 'all') && totalCount > 0 && (
            <span className="text-blue-600">Filtered Results: {totalCount}</span>
          )}
        </div>
        {consignors.length > 0 && hasMore && (
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50 text-sm"
          >
            {loadingMore ? '⏳ Loading...' : '📄 Load More'}
          </button>
        )}
      </div>

      {/* Consignors List */}
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
          </thead>          <tbody>
            {consignors.length > 0 ? consignors.map((consignor, index) => (
              <tr key={consignor.id} className={`hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                <td className="border-r px-4 py-3 text-black font-medium">{consignor.company_name}</td>
                <td className="border-r px-4 py-3 text-black text-sm">
                  {consignor.company_add.length > 50 
                    ? consignor.company_add.substring(0, 50) + '...'
                    : consignor.company_add
                  }
                </td>
                <td className="border-r px-4 py-3 text-black">{consignor.number || '-'}</td>
                <td className="border-r px-4 py-3 text-black">
                  {consignor.gst_num ? (
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                      {consignor.gst_num}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="border-r px-4 py-3 text-black">{consignor.pan || '-'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(consignor)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 rounded border border-blue-200 hover:bg-blue-50 transition-colors"
                      disabled={loading}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDelete(consignor.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium px-3 py-1 rounded border border-red-200 hover:bg-red-50 transition-colors"
                      disabled={loading}
                    >
                      🗑️ Delete
                    </button>                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                      Loading consignors...
                    </div>
                  ) : searchTerm || filterType !== 'all' ? (
                    <div>
                      <p className="text-lg mb-2">🔍 No consignors found matching your filters</p>
                      <button
                        onClick={clearFilters}
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        Clear filters to see all consignors
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-lg mb-2">📦 No consignors found</p>
                      <p className="text-sm">Add your first consignor using the form above</p>
                    </div>
                  )}
                </td>
              </tr>
            )}
            
            {/* Loading More Row */}
            {loadingMore && (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    Loading more consignors...
                  </div>
                </td>
              </tr>
            )}
            
            {/* Load More Row */}
            {!loading && !loadingMore && hasMore && consignors.length > 0 && (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center">
                  <button
                    onClick={loadMore}
                    className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 transition-colors"
                  >
                    📄 Load More Consignors
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ConsignorComponent;