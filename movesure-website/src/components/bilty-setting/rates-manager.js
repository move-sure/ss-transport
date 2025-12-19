'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../../app/utils/auth';
import supabase from '../../app/utils/supabase';

const RatesComponent = () => {
  const { user } = useAuth();
  
  // State
  const [rates, setRates] = useState([]);
  const [branches, setBranches] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  
  // Search
  const [searchTerm, setSearchTerm] = useState('');
  
  // Sorting
  const [sortConfig, setSortConfig] = useState({ key: 'city_name', direction: 'asc' });
  
  // Form
  const [formData, setFormData] = useState({
    branch_id: '',
    city_id: '',
    rate: ''
  });
  const [editingId, setEditingId] = useState(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [branchesRes, citiesRes, ratesRes] = await Promise.all([
        supabase.from('branches').select('*').eq('is_active', true).order('branch_name'),
        supabase.from('cities').select('*').order('city_name'),
        supabase.from('rates')
          .select(`
            *,
            branches (branch_name, branch_code),
            cities (city_name, city_code)
          `)
          .is('consignor_id', null)  // ONLY DEFAULT RATES
          .eq('is_default', true)
          .order('id', { ascending: false })
      ]);

      setBranches(branchesRes.data || []);
      setCities(citiesRes.data || []);
      setRates(ratesRes.data || []);
      
      // Set default branch
      if (user?.branch_id && !formData.branch_id) {
        setFormData(prev => ({ ...prev, branch_id: user.branch_id }));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.branch_id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Sorting function
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Sort icon
  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) {
      return <span className="ml-1 text-gray-400">↕</span>;
    }
    return sortConfig.direction === 'asc' 
      ? <span className="ml-1 text-blue-600">↑</span>
      : <span className="ml-1 text-blue-600">↓</span>;
  };

  // Filtered and sorted rates
  const filteredAndSortedRates = useMemo(() => {
    let result = [...rates];
    
    // Filter by search term
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      result = result.filter(rate => 
        rate.cities?.city_name?.toLowerCase().includes(search) ||
        rate.cities?.city_code?.toLowerCase().includes(search) ||
        rate.branches?.branch_name?.toLowerCase().includes(search) ||
        rate.branches?.branch_code?.toLowerCase().includes(search) ||
        rate.rate?.toString().includes(search)
      );
    }
    
    // Sort
    result.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortConfig.key) {
        case 'city_name':
          aValue = a.cities?.city_name || '';
          bValue = b.cities?.city_name || '';
          break;
        case 'city_code':
          aValue = a.cities?.city_code || '';
          bValue = b.cities?.city_code || '';
          break;
        case 'branch_name':
          aValue = a.branches?.branch_name || '';
          bValue = b.branches?.branch_name || '';
          break;
        case 'rate':
          aValue = parseFloat(a.rate) || 0;
          bValue = parseFloat(b.rate) || 0;
          break;
        default:
          aValue = a[sortConfig.key] || '';
          bValue = b[sortConfig.key] || '';
      }
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    return result;
  }, [rates, searchTerm, sortConfig]);

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.branch_id || !formData.city_id || !formData.rate) {
      alert('Please fill all required fields');
      return;
    }

    try {
      setSubmitLoading(true);
      
      const rateData = {
        branch_id: formData.branch_id,
        city_id: formData.city_id,
        consignor_id: null,  // Always null for default rates
        rate: parseFloat(formData.rate),
        is_default: true     // Always true
      };

      if (editingId) {
        // Update
        const { error } = await supabase
          .from('rates')
          .update(rateData)
          .eq('id', editingId);
        
        if (error) throw error;
      } else {
        // Check if rate exists for this branch + city
        const { data: existing } = await supabase
          .from('rates')
          .select('id')
          .eq('branch_id', formData.branch_id)
          .eq('city_id', formData.city_id)
          .is('consignor_id', null)
          .single();
        
        if (existing) {
          // Update existing
          const { error } = await supabase
            .from('rates')
            .update({ rate: parseFloat(formData.rate) })
            .eq('id', existing.id);
          
          if (error) throw error;
        } else {
          // Insert new
          const { error } = await supabase
            .from('rates')
            .insert([rateData]);
          
          if (error) throw error;
        }
      }
      
      // Reset form and refresh
      setFormData({ branch_id: user?.branch_id || '', city_id: '', rate: '' });
      setEditingId(null);
      fetchData();
      
    } catch (error) {
      console.error('Error saving rate:', error);
      alert('Error saving rate: ' + error.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  // Handle edit
  const handleEdit = (rate) => {
    setFormData({
      branch_id: rate.branch_id,
      city_id: rate.city_id,
      rate: rate.rate.toString()
    });
    setEditingId(rate.id);
  };

  // Handle delete
  const handleDelete = async (id) => {
    if (!confirm('Delete this rate?')) return;
    
    try {
      const { error } = await supabase.from('rates').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Error deleting rate');
    }
  };

  // Cancel edit
  const cancelEdit = () => {
    setFormData({ branch_id: user?.branch_id || '', city_id: '', rate: '' });
    setEditingId(null);
  };

  // Download CSV
  const downloadCSV = () => {
    const headers = ['Branch', 'City', 'City Code', 'Rate'];
    const rows = filteredAndSortedRates.map(rate => [
      rate.branches?.branch_name || '',
      rate.cities?.city_name || '',
      rate.cities?.city_code || '',
      rate.rate
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `default-rates-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Loading rates...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-black">Default Station Rates</h2>
        <button
          onClick={downloadCSV}
          className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center gap-2"
        >
          📥 Download CSV
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by city, branch, or rate..."
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black pr-10"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          )}
        </div>
        {searchTerm && (
          <div className="mt-2 text-sm text-gray-600">
            Found {filteredAndSortedRates.length} rates matching "{searchTerm}"
          </div>
        )}
      </div>
      
      {/* Add/Edit Form */}
      <form onSubmit={handleSubmit} className="mb-8 bg-gray-50 p-4 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Branch *
            </label>
            <select
              value={formData.branch_id}
              onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              City *
            </label>
            <select
              value={formData.city_id}
              onChange={(e) => setFormData({ ...formData, city_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rate (₹/kg) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.rate}
              onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="Enter rate"
              required
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitLoading}
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50 whitespace-nowrap"
            >
              {submitLoading ? 'Saving...' : (editingId ? 'Update' : 'Add Rate')}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Stats */}
      <div className="mb-4 text-sm text-gray-600">
        Total: {filteredAndSortedRates.length} default rates
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full table-auto border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th 
                className="border px-4 py-3 text-left font-bold text-black cursor-pointer hover:bg-gray-200 select-none"
                onClick={() => handleSort('branch_name')}
              >
                Branch <SortIcon columnKey="branch_name" />
              </th>
              <th 
                className="border px-4 py-3 text-left font-bold text-black cursor-pointer hover:bg-gray-200 select-none"
                onClick={() => handleSort('city_name')}
              >
                City <SortIcon columnKey="city_name" />
              </th>
              <th 
                className="border px-4 py-3 text-left font-bold text-black cursor-pointer hover:bg-gray-200 select-none"
                onClick={() => handleSort('city_code')}
              >
                Code <SortIcon columnKey="city_code" />
              </th>
              <th 
                className="border px-4 py-3 text-left font-bold text-black cursor-pointer hover:bg-gray-200 select-none"
                onClick={() => handleSort('rate')}
              >
                Rate (₹/kg) <SortIcon columnKey="rate" />
              </th>
              <th className="border px-4 py-3 text-left font-bold text-black">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedRates.length > 0 ? (
              filteredAndSortedRates.map((rate) => (
                <tr key={rate.id} className="hover:bg-gray-50">
                  <td className="border px-4 py-2 text-black">
                    {rate.branches?.branch_name || 'N/A'} 
                    <span className="text-gray-500 text-sm ml-1">({rate.branches?.branch_code || ''})</span>
                  </td>
                  <td className="border px-4 py-2 text-black font-medium">
                    {rate.cities?.city_name || 'N/A'}
                  </td>
                  <td className="border px-4 py-2 text-black">
                    {rate.cities?.city_code || 'N/A'}
                  </td>
                  <td className="border px-4 py-2 font-bold text-green-700">
                    ₹{rate.rate}
                  </td>
                  <td className="border px-4 py-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(rate)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(rate.id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="border px-4 py-8 text-center text-gray-500">
                  {searchTerm ? `No rates found matching "${searchTerm}"` : 'No default rates found. Add your first rate above.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RatesComponent;