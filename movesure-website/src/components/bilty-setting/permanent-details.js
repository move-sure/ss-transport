'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../app/utils/auth';
import supabase from '../../app/utils/supabase';

const PermanentDetailsComponent = () => {
  const { user } = useAuth();
  const [permanentDetails, setPermanentDetails] = useState([]);
  const [filteredDetails, setFilteredDetails] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    branch_id: '',
    transport_name: '',
    gst: '',
    mobile_number: '',
    bank_act_no_1: '',
    ifsc_code_1: '',
    bank_act_no_2: '',
    ifsc_code_2: '',
    transport_address: '',
    website: ''
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    filterDetails();
  }, [permanentDetails, searchTerm]);

  const filterDetails = () => {
    if (!searchTerm.trim()) {
      setFilteredDetails(permanentDetails);
      return;
    }

    const filtered = permanentDetails.filter(detail => {
      const searchLower = searchTerm.toLowerCase();
      return (
        detail.transport_name?.toLowerCase().includes(searchLower) ||
        detail.gst?.toLowerCase().includes(searchLower) ||
        detail.mobile_number?.toLowerCase().includes(searchLower) ||
        detail.transport_address?.toLowerCase().includes(searchLower) ||
        detail.branches?.branch_name?.toLowerCase().includes(searchLower) ||
        detail.branches?.branch_code?.toLowerCase().includes(searchLower)
      );
    });

    setFilteredDetails(filtered);
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);
      await fetchBranches();
      await fetchPermanentDetails();
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .eq('is_active', true)
      .order('branch_name');

    if (error) throw error;
    setBranches(data || []);
  };

  const fetchPermanentDetails = async () => {
    const { data, error } = await supabase
      .from('permanent_details')
      .select(`
        *,
        branches (branch_name, branch_code)
      `)
      .order('transport_name');

    if (error) throw error;
    setPermanentDetails(data || []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.branch_id || !formData.transport_name.trim()) {
      alert('Please fill all required fields');
      return;
    }

    try {
      setLoading(true);

      const detailData = {
        branch_id: formData.branch_id,
        transport_name: formData.transport_name.trim(),
        gst: formData.gst.trim().toUpperCase() || null,
        mobile_number: formData.mobile_number.trim() || null,
        bank_act_no_1: formData.bank_act_no_1.trim() || null,
        ifsc_code_1: formData.ifsc_code_1.trim().toUpperCase() || null,
        bank_act_no_2: formData.bank_act_no_2.trim() || null,
        ifsc_code_2: formData.ifsc_code_2.trim().toUpperCase() || null,
        transport_address: formData.transport_address.trim() || null,
        website: formData.website.trim() || null
      };

      if (editingId) {
        const { error } = await supabase
          .from('permanent_details')
          .update(detailData)
          .eq('id', editingId);

        if (error) throw error;
        alert('Permanent details updated successfully!');
      } else {
        const { error } = await supabase
          .from('permanent_details')
          .insert([detailData]);

        if (error) throw error;
        alert('Permanent details added successfully!');
      }

      setFormData({
        branch_id: '',
        transport_name: '',
        gst: '',
        mobile_number: '',
        bank_act_no_1: '',
        ifsc_code_1: '',
        bank_act_no_2: '',
        ifsc_code_2: '',
        transport_address: '',
        website: ''
      });
      setEditingId(null);
      fetchPermanentDetails();
    } catch (error) {
      console.error('Error saving permanent details:', error);
      alert('Error saving permanent details: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (detail) => {
    setFormData({
      branch_id: detail.branch_id,
      transport_name: detail.transport_name || '',
      gst: detail.gst || '',
      mobile_number: detail.mobile_number || '',
      bank_act_no_1: detail.bank_act_no_1 || '',
      ifsc_code_1: detail.ifsc_code_1 || '',
      bank_act_no_2: detail.bank_act_no_2 || '',
      ifsc_code_2: detail.ifsc_code_2 || '',
      transport_address: detail.transport_address || '',
      website: detail.website || ''
    });
    setEditingId(detail.id);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this permanent detail?')) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('permanent_details')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('Permanent details deleted successfully!');
      fetchPermanentDetails();
    } catch (error) {
      console.error('Error deleting permanent details:', error);
      alert('Error deleting permanent details: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setFormData({
      branch_id: '',
      transport_name: '',
      gst: '',
      mobile_number: '',
      bank_act_no_1: '',
      ifsc_code_1: '',
      bank_act_no_2: '',
      ifsc_code_2: '',
      transport_address: '',
      website: ''
    });
    setEditingId(null);
  };

  const downloadCSV = () => {
    const dataToExport = searchTerm && filteredDetails.length > 0 ? filteredDetails : permanentDetails;
    
    if (dataToExport.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = ['Branch', 'Transport Name', 'GST', 'Mobile', 'Bank A/C 1', 'IFSC 1', 'Bank A/C 2', 'IFSC 2', 'Address', 'Website'];
    const csvContent = [
      headers.join(','),
      ...dataToExport.map(detail => [
        `"${detail.branches?.branch_name || ''}"`,
        `"${detail.transport_name || ''}"`,
        `"${detail.gst || ''}"`,
        `"${detail.mobile_number || ''}"`,
        `"${detail.bank_act_no_1 || ''}"`,
        `"${detail.ifsc_code_1 || ''}"`,
        `"${detail.bank_act_no_2 || ''}"`,
        `"${detail.ifsc_code_2 || ''}"`,
        `"${detail.transport_address || ''}"`,
        `"${detail.website || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `permanent_details_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alert(`Exported ${dataToExport.length} permanent details to CSV`);
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-black">Manage Permanent Details</h2>
        <button
          onClick={downloadCSV}
          disabled={permanentDetails.length === 0}
          className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          📥 Export CSV
        </button>
      </div>

      {branches.length === 0 && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded-lg mb-6 flex items-center">
          <span className="mr-2">⚠️</span>
          <span className="font-medium">Please add branches first before adding permanent details.</span>
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
            placeholder="🔍 Search by transport name, branch, GST, mobile, or address..."
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
          {editingId ? '✏️ Edit Permanent Details' : '➕ Add New Permanent Details'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Branch *
            </label>
            <select
              value={formData.branch_id}
              onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              disabled={loading || branches.length === 0}
              required
            >
              <option value="">Select Branch</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.branch_name} ({branch.branch_code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Transport Name *
            </label>
            <input
              type="text"
              value={formData.transport_name}
              onChange={(e) => setFormData({ ...formData, transport_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="Enter transport name"
              disabled={loading}
              required
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-2">
              GST Number
            </label>
            <input
              type="text"
              value={formData.gst}
              onChange={(e) => setFormData({ ...formData, gst: e.target.value.toUpperCase() })}
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
              value={formData.mobile_number}
              onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="Enter mobile number"
              disabled={loading}
              maxLength={15}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Bank Account 1
            </label>
            <input
              type="text"
              value={formData.bank_act_no_1}
              onChange={(e) => setFormData({ ...formData, bank_act_no_1: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="Enter bank account number"
              disabled={loading}
              maxLength={50}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-2">
              IFSC Code 1
            </label>
            <input
              type="text"
              value={formData.ifsc_code_1}
              onChange={(e) => setFormData({ ...formData, ifsc_code_1: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="Enter IFSC code"
              disabled={loading}
              maxLength={11}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Bank Account 2
            </label>
            <input
              type="text"
              value={formData.bank_act_no_2}
              onChange={(e) => setFormData({ ...formData, bank_act_no_2: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="Enter bank account number"
              disabled={loading}
              maxLength={50}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-2">
              IFSC Code 2
            </label>
            <input
              type="text"
              value={formData.ifsc_code_2}
              onChange={(e) => setFormData({ ...formData, ifsc_code_2: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="Enter IFSC code"
              disabled={loading}
              maxLength={11}
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

          <div className="md:col-span-2 lg:col-span-3">
            <label className="block text-sm font-medium text-black mb-2">
              Transport Address
            </label>
            <textarea
              value={formData.transport_address}
              onChange={(e) => setFormData({ ...formData, transport_address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="Enter transport address"
              rows="3"
              disabled={loading}
              maxLength={500}
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading || branches.length === 0}
            className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? '⏳ Saving...' : editingId ? '✏️ Update Details' : '➕ Add Details'}
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
          <span className="font-medium">Total Details: {permanentDetails.length}</span>
          {searchTerm && (
            <span className="ml-4 text-blue-600">
              Filtered: {filteredDetails.length} of {permanentDetails.length}
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

      {/* Details List */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full table-auto border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="border-r px-4 py-3 text-left font-bold text-black">Branch</th>
              <th className="border-r px-4 py-3 text-left font-bold text-black">Transport Name</th>
              <th className="border-r px-4 py-3 text-left font-bold text-black">GST</th>
              <th className="border-r px-4 py-3 text-left font-bold text-black">Mobile</th>
              <th className="border-r px-4 py-3 text-left font-bold text-black">Bank Details</th>
              <th className="px-4 py-3 text-left font-bold text-black">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDetails.length > 0 ? filteredDetails.map((detail, index) => (
              <tr key={detail.id} className={`hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                <td className="border-r px-4 py-3 text-black">
                  {detail.branches?.branch_name} ({detail.branches?.branch_code})
                </td>
                <td className="border-r px-4 py-3 text-black font-medium">{detail.transport_name}</td>
                <td className="border-r px-4 py-3 text-black">{detail.gst || '-'}</td>
                <td className="border-r px-4 py-3 text-black">{detail.mobile_number || '-'}</td>
                <td className="border-r px-4 py-3 text-black text-sm">
                  {detail.bank_act_no_1 ? (
                    <div>
                      <div>A/C: {detail.bank_act_no_1}</div>
                      <div>IFSC: {detail.ifsc_code_1}</div>
                    </div>
                  ) : '-'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(detail)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 rounded border border-blue-200 hover:bg-blue-50 transition-colors"
                      disabled={loading}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDelete(detail.id)}
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
                      Loading permanent details...
                    </div>
                  ) : searchTerm ? (
                    <div>
                      <p className="text-lg mb-2">🔍 No details found matching {searchTerm}</p>
                      <button
                        onClick={clearSearch}
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        Clear search to see all details
                      </button>
                    </div>
                  ) : branches.length === 0 ? (
                    <div>
                      <p className="text-lg mb-2">🏢 No branches available</p>
                      <p className="text-sm">Please add branches first before adding permanent details</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-lg mb-2">📋 No permanent details found</p>
                      <p className="text-sm">Add your first permanent details using the form above</p>
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

export default PermanentDetailsComponent;