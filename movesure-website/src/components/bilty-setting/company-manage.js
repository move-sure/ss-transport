'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../app/utils/auth';
import supabase from '../../app/utils/supabase';

// Company Master — one row per billing entity (letterhead). Used by bill books / challan books
// to pick which company's name/GST/address/logo prints on that book's documents.
// Reads/writes go straight to Supabase (the /api/bilty/master/companies REST route isn't
// registered on the live backend yet), matching the pattern already used by bill-manager.js.

const emptyForm = {
  company_name: '',
  short_code: '',
  gst_number: '',
  pan: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  mobile_number: '',
  alternate_number: '',
  email: '',
  bank_account_number: '',
  bank_ifsc_code: '',
  logo_url: '',
  website: '',
  is_active: true,
};

const CompanyManageComponent = () => {
  const { user } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [formData, setFormData] = useState({ ...emptyForm });

  useEffect(() => { fetchCompanies(); }, []);
  useEffect(() => { filterCompanies(); }, [companies, searchTerm]);

  const filterCompanies = () => {
    if (!searchTerm.trim()) { setFiltered(companies); return; }
    const term = searchTerm.toLowerCase();
    setFiltered(companies.filter(c =>
      c.company_name?.toLowerCase().includes(term) ||
      c.short_code?.toLowerCase().includes(term) ||
      c.gst_number?.toLowerCase().includes(term) ||
      c.city?.toLowerCase().includes(term) ||
      c.mobile_number?.includes(term)
    ));
  };

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('company_name');
      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
      alert('Error fetching companies: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { alert('File size must be less than 5MB'); return; }
    if (!file.type.startsWith('image/')) { alert('Please select an image file'); return; }

    try {
      setImageUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `companies/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

      const { error } = await supabase.storage
        .from('uploads')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });
      if (error) throw error;

      const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(fileName);
      setFormData(prev => ({ ...prev, logo_url: urlData.publicUrl }));
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Error uploading logo: ' + error.message);
    } finally {
      setImageUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.company_name.trim()) { alert('Company name is required'); return; }

    try {
      setLoading(true);
      const saveData = {
        company_name: formData.company_name.trim(),
        short_code: formData.short_code.trim() || null,
        gst_number: formData.gst_number.trim().toUpperCase() || null,
        pan: formData.pan.trim().toUpperCase() || null,
        address: formData.address.trim() || null,
        city: formData.city.trim() || null,
        state: formData.state.trim() || null,
        pincode: formData.pincode.trim() || null,
        mobile_number: formData.mobile_number.trim() || null,
        alternate_number: formData.alternate_number.trim() || null,
        email: formData.email.trim() || null,
        bank_account_number: formData.bank_account_number.trim() || null,
        bank_ifsc_code: formData.bank_ifsc_code.trim().toUpperCase() || null,
        logo_url: formData.logo_url || null,
        website: formData.website.trim() || null,
        is_active: formData.is_active,
      };

      if (editingId) {
        const { error } = await supabase
          .from('companies')
          .update({ ...saveData, updated_by: user?.id || null, updated_at: new Date().toISOString() })
          .eq('id', editingId);
        if (error) throw error;
        alert('Company updated successfully!');
      } else {
        const { error } = await supabase
          .from('companies')
          .insert([{ ...saveData, created_by: user?.id || null, created_at: new Date().toISOString() }]);
        if (error) throw error;
        alert('Company added successfully!');
      }

      resetForm();
      fetchCompanies();
    } catch (error) {
      console.error('Error saving company:', error);
      alert('Error saving: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (company) => {
    setFormData({
      company_name: company.company_name || '',
      short_code: company.short_code || '',
      gst_number: company.gst_number || '',
      pan: company.pan || '',
      address: company.address || '',
      city: company.city || '',
      state: company.state || '',
      pincode: company.pincode || '',
      mobile_number: company.mobile_number || '',
      alternate_number: company.alternate_number || '',
      email: company.email || '',
      bank_account_number: company.bank_account_number || '',
      bank_ifsc_code: company.bank_ifsc_code || '',
      logo_url: company.logo_url || '',
      website: company.website || '',
      is_active: company.is_active !== false,
    });
    setEditingId(company.id);
    setShowForm(true);
    setExpandedRow(null);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this company? Any bill/challan book already tagged with it will keep its saved documents unaffected, but you should reassign the book first.')) return;
    try {
      setLoading(true);
      const { error } = await supabase.from('companies').delete().eq('id', id);
      if (error) throw error;
      alert('Company deleted successfully!');
      fetchCompanies();
    } catch (error) {
      console.error('Error deleting company:', error);
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
      <div className="bg-gradient-to-r from-teal-50 to-emerald-50 p-3 rounded-lg border border-teal-200 mb-3">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-gray-900">🏢 Company Master</h2>
            <p className="text-xs text-gray-600">Billing entities / letterheads — assign one to each bill book or challan book</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }}
              className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 flex items-center gap-1 text-xs font-medium shadow"
            >
              {showForm ? '📋 List' : '➕ Add Company'}
            </button>
            <button onClick={fetchCompanies} className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 text-xs font-medium shadow">
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
              {editingId ? '✏️ Edit Company' : '➕ Add Company'}
            </h3>
            <button type="button" onClick={resetForm} className="text-gray-500 hover:text-gray-700 text-lg">✖</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Company Name *</label>
              <input type="text" value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-black focus:outline-none focus:ring-1 focus:ring-teal-500"
                placeholder="e.g., SS TRANSPORT CORPORATION" required maxLength={150} disabled={loading} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Short Code</label>
              <input type="text" value={formData.short_code}
                onChange={(e) => setFormData({ ...formData, short_code: e.target.value.toUpperCase() })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-black focus:outline-none focus:ring-1 focus:ring-teal-500"
                placeholder="e.g., SSML" maxLength={20} disabled={loading} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">GST Number</label>
              <input type="text" value={formData.gst_number}
                onChange={(e) => setFormData({ ...formData, gst_number: e.target.value.toUpperCase() })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-black focus:outline-none focus:ring-1 focus:ring-teal-500"
                placeholder="09XXXXX0000X1ZX" maxLength={20} disabled={loading} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">PAN</label>
              <input type="text" value={formData.pan}
                onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-black focus:outline-none focus:ring-1 focus:ring-teal-500"
                placeholder="AAAAA0000A" maxLength={15} disabled={loading} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
              <input type="text" value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-black focus:outline-none focus:ring-1 focus:ring-teal-500"
                placeholder="Letterhead address" disabled={loading} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">City</label>
              <input type="text" value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-black focus:outline-none focus:ring-1 focus:ring-teal-500"
                disabled={loading} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">State</label>
              <input type="text" value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-black focus:outline-none focus:ring-1 focus:ring-teal-500"
                disabled={loading} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Pincode</label>
              <input type="text" value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, '') })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-black focus:outline-none focus:ring-1 focus:ring-teal-500"
                maxLength={6} disabled={loading} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Mobile Number</label>
              <input type="tel" value={formData.mobile_number}
                onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value.replace(/\D/g, '') })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-black focus:outline-none focus:ring-1 focus:ring-teal-500"
                maxLength={15} disabled={loading} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Alternate Number</label>
              <input type="tel" value={formData.alternate_number}
                onChange={(e) => setFormData({ ...formData, alternate_number: e.target.value.replace(/\D/g, '') })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-black focus:outline-none focus:ring-1 focus:ring-teal-500"
                maxLength={15} disabled={loading} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-black focus:outline-none focus:ring-1 focus:ring-teal-500"
                disabled={loading} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Website</label>
              <input type="url" value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-black focus:outline-none focus:ring-1 focus:ring-teal-500"
                placeholder="https://example.com" disabled={loading} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Bank Account Number</label>
              <input type="text" value={formData.bank_account_number}
                onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-black focus:outline-none focus:ring-1 focus:ring-teal-500"
                disabled={loading} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Bank IFSC Code</label>
              <input type="text" value={formData.bank_ifsc_code}
                onChange={(e) => setFormData({ ...formData, bank_ifsc_code: e.target.value.toUpperCase() })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-black focus:outline-none focus:ring-1 focus:ring-teal-500"
                maxLength={11} disabled={loading} />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 border border-gray-300 rounded">
                <input type="checkbox" checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-teal-600 border-gray-300 rounded" />
                <span className="text-xs text-gray-700">Active</span>
              </label>
            </div>
          </div>

          {/* Logo Upload */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">🖼️ Letterhead Logo</label>
            <div className="flex items-center gap-2">
              <input type="file" accept="image/*" onChange={handleImageUpload}
                className="flex-1 text-xs text-gray-600 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                disabled={loading || imageUploading} />
              {formData.logo_url && (
                <div className="flex items-center gap-1">
                  <img src={formData.logo_url} alt="Logo" className="w-10 h-10 object-contain rounded border bg-white" />
                  <button type="button" onClick={() => setFormData({ ...formData, logo_url: '' })} className="text-red-500 text-xs">✖</button>
                </div>
              )}
            </div>
            {imageUploading && (
              <div className="flex items-center gap-2 text-teal-600 text-xs mt-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600"></div>
                Uploading logo...
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2 border-t border-gray-200">
            <button type="submit" disabled={loading || imageUploading}
              className="bg-teal-600 text-white px-4 py-1.5 rounded text-xs hover:bg-teal-700 disabled:opacity-50 font-medium shadow">
              {loading ? '⏳ Saving...' : editingId ? '✏️ Update' : '➕ Add'}
            </button>
            <button type="button" onClick={resetForm} className="bg-gray-500 text-white px-4 py-1.5 rounded text-xs hover:bg-gray-600 font-medium shadow">
              ❌ Cancel
            </button>
          </div>
        </form>
      )}

      {/* Search & List */}
      {!showForm && (
        <div className="bg-white p-3 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 relative">
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="🔍 Search by name, short code, GST, city..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white placeholder-gray-400" />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">✖</button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-teal-100 px-3 py-1.5 rounded">
                <span className="text-xs font-medium text-gray-600">Total: </span>
                <span className="text-sm font-bold text-teal-600">{companies.length}</span>
              </div>
              {searchTerm && (
                <div className="bg-green-100 px-3 py-1.5 rounded">
                  <span className="text-xs font-medium text-gray-600">Found: </span>
                  <span className="text-sm font-bold text-green-600">{filtered.length}</span>
                </div>
              )}
            </div>
          </div>

          <div className="overflow-x-auto rounded border border-gray-200">
            <table className="w-full table-auto border-collapse text-xs">
              <thead className="bg-teal-100">
                <tr>
                  <th className="border-r border-teal-200 px-3 py-2 text-left font-semibold text-teal-900 w-8">#</th>
                  <th className="border-r border-teal-200 px-3 py-2 text-left font-semibold text-teal-900">Logo</th>
                  <th className="border-r border-teal-200 px-3 py-2 text-left font-semibold text-teal-900">Company Name</th>
                  <th className="border-r border-teal-200 px-3 py-2 text-left font-semibold text-teal-900">Short Code</th>
                  <th className="border-r border-teal-200 px-3 py-2 text-left font-semibold text-teal-900">GSTIN</th>
                  <th className="border-r border-teal-200 px-3 py-2 text-left font-semibold text-teal-900">City</th>
                  <th className="border-r border-teal-200 px-3 py-2 text-left font-semibold text-teal-900">Mobile</th>
                  <th className="border-r border-teal-200 px-3 py-2 text-left font-semibold text-teal-900">Status</th>
                  <th className="px-3 py-2 text-left font-semibold text-teal-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? (
                  filtered.map((company, index) => {
                    const isExpanded = expandedRow === company.id;
                    return (
                      <React.Fragment key={company.id}>
                        <tr
                          className={`hover:bg-teal-50 transition-colors cursor-pointer ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${isExpanded ? 'bg-teal-50' : ''}`}
                          onClick={() => setExpandedRow(isExpanded ? null : company.id)}
                        >
                          <td className="border-r border-gray-200 px-3 py-2 text-gray-600 font-bold">{index + 1}</td>
                          <td className="border-r border-gray-200 px-3 py-2">
                            {company.logo_url ? (
                              <img src={company.logo_url} alt="" className="w-8 h-8 object-contain rounded border bg-white" />
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="border-r border-gray-200 px-3 py-2">
                            <span className="font-bold text-gray-900">{company.company_name}</span>
                          </td>
                          <td className="border-r border-gray-200 px-3 py-2 text-gray-900">
                            {company.short_code || <span className="text-gray-400 italic">-</span>}
                          </td>
                          <td className="border-r border-gray-200 px-3 py-2">
                            {company.gst_number ? (
                              <span className="font-mono text-xs bg-yellow-100 text-gray-900 px-2 py-0.5 rounded border border-yellow-300 font-semibold">{company.gst_number}</span>
                            ) : (
                              <span className="text-gray-400 italic">Not added</span>
                            )}
                          </td>
                          <td className="border-r border-gray-200 px-3 py-2 text-gray-900">
                            {company.city || <span className="text-gray-400 italic">-</span>}
                          </td>
                          <td className="border-r border-gray-200 px-3 py-2 text-gray-900 font-medium">
                            {company.mobile_number || <span className="text-gray-400 italic">-</span>}
                          </td>
                          <td className="border-r border-gray-200 px-3 py-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${company.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                              {company.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                            <div className="flex gap-1">
                              <button onClick={() => handleEdit(company)} className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-2 py-1 rounded text-xs font-medium" disabled={loading}>✏️</button>
                              <button onClick={() => handleDelete(company.id)} className="bg-red-100 text-red-700 hover:bg-red-200 px-2 py-1 rounded text-xs font-medium" disabled={loading}>🗑️</button>
                            </div>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-teal-50 border-b-2 border-teal-200">
                            <td colSpan="9" className="px-4 py-3">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                <div className="space-y-1">
                                  <h4 className="text-sm font-bold text-teal-800 mb-1">📋 Details</h4>
                                  {company.address && <div><span className="text-gray-600 font-medium">Address:</span> <span className="text-gray-900">{company.address}{company.state ? `, ${company.state}` : ''}{company.pincode ? ` - ${company.pincode}` : ''}</span></div>}
                                  {company.pan && <div><span className="text-gray-600 font-medium">PAN:</span> <span className="text-gray-900 font-mono">{company.pan}</span></div>}
                                  {company.email && <div><span className="text-gray-600 font-medium">Email:</span> <span className="text-gray-900">{company.email}</span></div>}
                                  {company.alternate_number && <div><span className="text-gray-600 font-medium">Alt Mobile:</span> <span className="text-gray-900">{company.alternate_number}</span></div>}
                                  {company.website && <div><span className="text-gray-600 font-medium">Website:</span> <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline" onClick={e => e.stopPropagation()}>{company.website}</a></div>}
                                </div>
                                <div className="space-y-1">
                                  <h4 className="text-sm font-bold text-teal-800 mb-1">🏦 Bank Details</h4>
                                  {company.bank_account_number ? (
                                    <>
                                      <div><span className="text-gray-600 font-medium">A/C No:</span> <span className="text-gray-900 font-mono">{company.bank_account_number}</span></div>
                                      <div><span className="text-gray-600 font-medium">IFSC:</span> <span className="text-gray-900 font-mono">{company.bank_ifsc_code}</span></div>
                                    </>
                                  ) : (
                                    <p className="text-gray-400 italic">No bank details added</p>
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
                    <td colSpan="9" className="px-6 py-16 text-center">
                      {loading ? (
                        <div className="flex flex-col items-center justify-center space-y-4">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-teal-600"></div>
                          <p className="text-gray-600 font-medium">Loading companies...</p>
                        </div>
                      ) : searchTerm ? (
                        <div className="space-y-4">
                          <span className="text-5xl">🔍</span>
                          <p className="text-xl text-gray-700 font-medium">No results found</p>
                          <button onClick={() => setSearchTerm('')} className="mt-4 bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 font-medium">Clear Search</button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <span className="text-5xl">🏢</span>
                          <p className="text-xl text-gray-700 font-medium">No companies found</p>
                          <p className="text-gray-500">Add your first company — e.g. the existing SS TRANSPORT CORPORATION letterhead, then any additional ones</p>
                          <button onClick={() => setShowForm(true)} className="mt-4 bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 font-medium">➕ Add First Company</button>
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

export default CompanyManageComponent;
