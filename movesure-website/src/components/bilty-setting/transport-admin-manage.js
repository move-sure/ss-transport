'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../app/utils/auth';
import supabase from '../../app/utils/supabase';

const TransportAdminComponent = () => {
  const { user } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [filteredAdmins, setFilteredAdmins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [linkedTransports, setLinkedTransports] = useState({});

  const emptyForm = {
    transport_name: '',
    gstin: '',
    hub_mobile_number: '',
    owner_name: '',
    website: '',
    address: '',
    sample_ref_image: '',
    sample_challan_image: ''
  };

  const [formData, setFormData] = useState({ ...emptyForm });

  useEffect(() => {
    fetchAdmins();
  }, []);

  useEffect(() => {
    filterAdmins();
  }, [admins, searchTerm]);

  const filterAdmins = () => {
    if (!searchTerm.trim()) {
      setFilteredAdmins(admins);
      return;
    }
    const term = searchTerm.toLowerCase();
    const filtered = admins.filter(a =>
      a.transport_name?.toLowerCase().includes(term) ||
      a.gstin?.toLowerCase().includes(term) ||
      a.owner_name?.toLowerCase().includes(term) ||
      a.hub_mobile_number?.includes(term) ||
      a.address?.toLowerCase().includes(term)
    );
    setFilteredAdmins(filtered);
  };

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('transport_admin')
        .select('*')
        .order('transport_name');

      if (error) throw error;
      setAdmins(data || []);

      // Fetch linked transport counts
      if (data && data.length > 0) {
        const adminIds = data.map(a => a.transport_id);
        const { data: transports, error: tErr } = await supabase
          .from('transports')
          .select('transport_admin_id, id, transport_name, city_name')
          .in('transport_admin_id', adminIds);

        if (!tErr && transports) {
          const map = {};
          transports.forEach(t => {
            if (!map[t.transport_admin_id]) map[t.transport_admin_id] = [];
            map[t.transport_admin_id].push(t);
          });
          setLinkedTransports(map);
        }
      }
    } catch (error) {
      console.error('Error fetching transport admins:', error);
      alert('Error fetching transport admins: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    try {
      setImageUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `transport-admin/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('uploads')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (error) throw error;

      const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(fileName);
      setFormData(prev => ({ ...prev, [field]: urlData.publicUrl }));
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error uploading image: ' + error.message);
    } finally {
      setImageUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.transport_name.trim()) {
      alert('Transport Admin name is required');
      return;
    }

    try {
      setLoading(true);

      const saveData = {
        transport_name: formData.transport_name.trim(),
        gstin: formData.gstin.trim() || null,
        hub_mobile_number: formData.hub_mobile_number.trim() || null,
        owner_name: formData.owner_name.trim() || null,
        website: formData.website.trim() || null,
        address: formData.address.trim() || null,
        sample_ref_image: formData.sample_ref_image || null,
        sample_challan_image: formData.sample_challan_image || null,
        updated_by: user?.id || null,
        updated_at: new Date().toISOString()
      };

      if (editingId) {
        const { error } = await supabase
          .from('transport_admin')
          .update(saveData)
          .eq('transport_id', editingId);
        if (error) throw error;
        alert('Transport Admin updated successfully!');
      } else {
        saveData.created_by = user?.id || null;
        const { error } = await supabase
          .from('transport_admin')
          .insert([saveData]);
        if (error) throw error;
        alert('Transport Admin added successfully!');
      }

      resetForm();
      fetchAdmins();
    } catch (error) {
      console.error('Error saving transport admin:', error);
      alert('Error saving: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (admin) => {
    setFormData({
      transport_name: admin.transport_name || '',
      gstin: admin.gstin || '',
      hub_mobile_number: admin.hub_mobile_number || '',
      owner_name: admin.owner_name || '',
      website: admin.website || '',
      address: admin.address || '',
      sample_ref_image: admin.sample_ref_image || '',
      sample_challan_image: admin.sample_challan_image || ''
    });
    setEditingId(admin.transport_id);
    setShowForm(true);
    setExpandedRow(null);
  };

  const handleDelete = async (id) => {
    const linked = linkedTransports[id];
    if (linked && linked.length > 0) {
      alert(`Cannot delete: ${linked.length} transport(s) are linked to this admin. Please unlink them first.`);
      return;
    }
    if (!confirm('Are you sure you want to delete this Transport Admin?')) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('transport_admin')
        .delete()
        .eq('transport_id', id);
      if (error) throw error;
      alert('Transport Admin deleted successfully!');
      fetchAdmins();
    } catch (error) {
      console.error('Error deleting transport admin:', error);
      alert('Error deleting: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ ...emptyForm });
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-3 rounded-lg border border-purple-200 mb-3">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-gray-900">🏭 Transport Admin Management</h2>
            <p className="text-xs text-gray-600">Manage parent transport companies (head offices)</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-1 text-xs font-medium shadow"
            >
              {showForm ? '📋 List' : '➕ Add Admin'}
            </button>
            <button
              onClick={fetchAdmins}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 text-xs font-medium shadow"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow border border-gray-200 mb-3">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-base font-bold text-gray-900">
              {editingId ? '✏️ Edit Transport Admin' : '➕ Add Transport Admin'}
            </h3>
            <button type="button" onClick={resetForm} className="text-gray-500 hover:text-gray-700 text-lg">✖</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Transport Admin Name *</label>
              <input
                type="text"
                value={formData.transport_name}
                onChange={(e) => setFormData({ ...formData, transport_name: e.target.value })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-black focus:outline-none focus:ring-1 focus:ring-purple-500"
                placeholder="Company name (e.g., VRL Logistics)"
                required
                maxLength={150}
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">GSTIN</label>
              <input
                type="text"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-black focus:outline-none focus:ring-1 focus:ring-purple-500"
                placeholder="GST Number (15 digits)"
                maxLength={20}
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Hub Mobile Number</label>
              <input
                type="tel"
                value={formData.hub_mobile_number}
                onChange={(e) => setFormData({ ...formData, hub_mobile_number: e.target.value.replace(/\D/g, '') })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-black focus:outline-none focus:ring-1 focus:ring-purple-500"
                placeholder="10 digit number"
                maxLength={15}
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Owner Name</label>
              <input
                type="text"
                value={formData.owner_name}
                onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-black focus:outline-none focus:ring-1 focus:ring-purple-500"
                placeholder="Owner / MD name"
                maxLength={100}
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Website</label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-black focus:outline-none focus:ring-1 focus:ring-purple-500"
                placeholder="https://example.com"
                maxLength={150}
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-black focus:outline-none focus:ring-1 focus:ring-purple-500"
                placeholder="Head office address"
                disabled={loading}
              />
            </div>
          </div>

          {/* Image Uploads */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">📸 Sample Reference Image</label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'sample_ref_image')}
                  className="flex-1 text-xs text-gray-600 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                  disabled={loading || imageUploading}
                />
                {formData.sample_ref_image && (
                  <div className="flex items-center gap-1">
                    <img src={formData.sample_ref_image} alt="Ref" className="w-10 h-10 object-cover rounded border" />
                    <button type="button" onClick={() => setFormData({ ...formData, sample_ref_image: '' })} className="text-red-500 text-xs">✖</button>
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">📄 Sample Challan Image</label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'sample_challan_image')}
                  className="flex-1 text-xs text-gray-600 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                  disabled={loading || imageUploading}
                />
                {formData.sample_challan_image && (
                  <div className="flex items-center gap-1">
                    <img src={formData.sample_challan_image} alt="Challan" className="w-10 h-10 object-cover rounded border" />
                    <button type="button" onClick={() => setFormData({ ...formData, sample_challan_image: '' })} className="text-red-500 text-xs">✖</button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {imageUploading && (
            <div className="flex items-center gap-2 text-purple-600 text-xs mb-3">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
              Uploading image...
            </div>
          )}

          <div className="flex gap-2 pt-2 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading || imageUploading}
              className="bg-purple-600 text-white px-4 py-1.5 rounded text-xs hover:bg-purple-700 disabled:opacity-50 font-medium shadow"
            >
              {loading ? '⏳ Saving...' : editingId ? '✏️ Update' : '➕ Add'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="bg-gray-500 text-white px-4 py-1.5 rounded text-xs hover:bg-gray-600 font-medium shadow"
            >
              ❌ Cancel
            </button>
          </div>
        </form>
      )}

      {/* Search & List */}
      {!showForm && (
        <div className="bg-white p-3 rounded-lg shadow border border-gray-200">
          {/* Search */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="🔍 Search by name, GSTIN, owner, mobile..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white placeholder-gray-400"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ✖
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-purple-100 px-3 py-1.5 rounded">
                <span className="text-xs font-medium text-gray-600">Total: </span>
                <span className="text-sm font-bold text-purple-600">{admins.length}</span>
              </div>
              {searchTerm && (
                <div className="bg-green-100 px-3 py-1.5 rounded">
                  <span className="text-xs font-medium text-gray-600">Found: </span>
                  <span className="text-sm font-bold text-green-600">{filteredAdmins.length}</span>
                </div>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded border border-gray-200">
            <table className="w-full table-auto border-collapse text-xs">
              <thead className="bg-purple-100">
                <tr>
                  <th className="border-r border-purple-200 px-3 py-2 text-left font-semibold text-purple-900 w-8">#</th>
                  <th className="border-r border-purple-200 px-3 py-2 text-left font-semibold text-purple-900">Transport Admin Name</th>
                  <th className="border-r border-purple-200 px-3 py-2 text-left font-semibold text-purple-900">GSTIN</th>
                  <th className="border-r border-purple-200 px-3 py-2 text-left font-semibold text-purple-900">Hub Mobile</th>
                  <th className="border-r border-purple-200 px-3 py-2 text-left font-semibold text-purple-900">Owner</th>
                  <th className="border-r border-purple-200 px-3 py-2 text-left font-semibold text-purple-900">Website</th>
                  <th className="border-r border-purple-200 px-3 py-2 text-left font-semibold text-purple-900">Linked Branches</th>
                  <th className="px-3 py-2 text-left font-semibold text-purple-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAdmins.length > 0 ? (
                  filteredAdmins.map((admin, index) => {
                    const linked = linkedTransports[admin.transport_id] || [];
                    const isExpanded = expandedRow === admin.transport_id;

                    return (
                      <React.Fragment key={admin.transport_id}>
                        <tr
                          className={`hover:bg-purple-50 transition-colors cursor-pointer ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${isExpanded ? 'bg-purple-50' : ''}`}
                          onClick={() => setExpandedRow(isExpanded ? null : admin.transport_id)}
                        >
                          <td className="border-r border-gray-200 px-3 py-2 text-gray-600 font-bold">{index + 1}</td>
                          <td className="border-r border-gray-200 px-3 py-2">
                            <span className="font-bold text-gray-900">{admin.transport_name}</span>
                          </td>
                          <td className="border-r border-gray-200 px-3 py-2">
                            {admin.gstin ? (
                              <span className="font-mono text-xs bg-yellow-100 text-gray-900 px-2 py-0.5 rounded border border-yellow-300 font-semibold">{admin.gstin}</span>
                            ) : (
                              <span className="text-gray-400 italic">Not added</span>
                            )}
                          </td>
                          <td className="border-r border-gray-200 px-3 py-2 text-gray-900 font-medium">
                            {admin.hub_mobile_number || <span className="text-gray-400 italic">-</span>}
                          </td>
                          <td className="border-r border-gray-200 px-3 py-2 text-gray-900">
                            {admin.owner_name || <span className="text-gray-400 italic">-</span>}
                          </td>
                          <td className="border-r border-gray-200 px-3 py-2">
                            {admin.website ? (
                              <a href={admin.website} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline hover:text-blue-900 text-xs truncate block max-w-[150px] font-medium" onClick={e => e.stopPropagation()}>
                                🌐 {admin.website.replace(/https?:\/\//, '')}
                              </a>
                            ) : (
                              <span className="text-gray-400 italic">-</span>
                            )}
                          </td>
                          <td className="border-r border-gray-200 px-3 py-2">
                            {linked.length > 0 ? (
                              <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs font-semibold">
                                {linked.length} branch{linked.length > 1 ? 'es' : ''}
                              </span>
                            ) : (
                              <span className="text-gray-500 text-xs italic">No branches linked</span>
                            )}
                          </td>
                          <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleEdit(admin)}
                                className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-2 py-1 rounded text-xs font-medium"
                                disabled={loading}
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDelete(admin.transport_id)}
                                className="bg-red-100 text-red-700 hover:bg-red-200 px-2 py-1 rounded text-xs font-medium"
                                disabled={loading}
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expanded Details Row */}
                        {isExpanded && (
                          <tr className="bg-purple-50 border-b-2 border-purple-200">
                            <td colSpan="8" className="px-4 py-3">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Left: Details */}
                                <div className="space-y-2">
                                  <h4 className="text-sm font-bold text-purple-800 mb-2">📋 Details</h4>
                                  {admin.address && (
                                    <div className="text-xs">
                                      <span className="text-gray-600 font-medium">Address:</span>{' '}
                                      <span className="text-gray-900">{admin.address}</span>
                                    </div>
                                  )}
                                  <div className="text-xs">
                                    <span className="text-gray-600 font-medium">Created:</span>{' '}
                                    <span className="text-gray-900">
                                      {admin.created_at ? new Date(admin.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                                    </span>
                                  </div>

                                  {/* Images */}
                                  <div className="flex gap-3 mt-2">
                                    {admin.sample_ref_image && (
                                      <div>
                                        <p className="text-xs text-gray-700 font-medium mb-1">📸 Ref Image</p>
                                        <a href={admin.sample_ref_image} target="_blank" rel="noopener noreferrer">
                                          <img src={admin.sample_ref_image} alt="Ref" className="w-24 h-24 object-cover rounded border-2 border-gray-300 hover:border-purple-500 transition-colors shadow-sm" />
                                        </a>
                                      </div>
                                    )}
                                    {admin.sample_challan_image && (
                                      <div>
                                        <p className="text-xs text-gray-700 font-medium mb-1">📄 Challan Image</p>
                                        <a href={admin.sample_challan_image} target="_blank" rel="noopener noreferrer">
                                          <img src={admin.sample_challan_image} alt="Challan" className="w-24 h-24 object-cover rounded border-2 border-gray-300 hover:border-purple-500 transition-colors shadow-sm" />
                                        </a>
                                      </div>
                                    )}
                                    {!admin.sample_ref_image && !admin.sample_challan_image && (
                                      <p className="text-xs text-gray-400 italic">No images uploaded</p>
                                    )}
                                  </div>
                                </div>

                                {/* Right: Linked Branches */}
                                <div>
                                  <h4 className="text-sm font-bold text-green-800 mb-2">🚛 Linked Transport Branches ({linked.length})</h4>
                                  {linked.length > 0 ? (
                                    <div className="space-y-1 max-h-40 overflow-y-auto">
                                      {linked.map(t => (
                                        <div key={t.id} className="flex items-center justify-between bg-white px-2 py-1.5 rounded border border-gray-200 text-xs">
                                          <div>
                                            <span className="font-semibold text-black">{t.transport_name}</span>
                                            <span className="text-gray-500 ml-1">({t.city_name})</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-gray-400 italic">No branches linked yet. Go to Transporters tab to link branches.</p>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="8" className="px-6 py-16 text-center">
                      {loading ? (
                        <div className="flex flex-col items-center justify-center space-y-4">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-600"></div>
                          <p className="text-gray-600 font-medium">Loading transport admins...</p>
                        </div>
                      ) : searchTerm ? (
                        <div className="space-y-4">
                          <span className="text-5xl">🔍</span>
                          <p className="text-xl text-gray-700 font-medium">No results found</p>
                          <p className="text-gray-500">Try adjusting your search</p>
                          <button
                            onClick={() => setSearchTerm('')}
                            className="mt-4 bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 font-medium"
                          >
                            Clear Search
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <span className="text-5xl">🏭</span>
                          <p className="text-xl text-gray-700 font-medium">No Transport Admins found</p>
                          <p className="text-gray-500">Click &quot;Add Admin&quot; to create the first transport admin company</p>
                          <button
                            onClick={() => setShowForm(true)}
                            className="mt-4 bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 font-medium"
                          >
                            ➕ Add First Transport Admin
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

export default TransportAdminComponent;
