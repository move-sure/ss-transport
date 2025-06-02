'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../app/utils/auth';
import supabase from '../../app/utils/supabase';

const RatesComponent = () => {
  const { user } = useAuth();
  const [rates, setRates] = useState([]);
  const [filteredRates, setFilteredRates] = useState([]);
  const [branches, setBranches] = useState([]);
  const [cities, setCities] = useState([]);
  const [consignors, setConsignors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    branch_id: '',
    city_id: '',
    consignor_id: '',
    rate: '',
    is_default: false
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    filterRates();
  }, [rates, searchTerm]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      await fetchBranches();
      await fetchCities();
      await fetchConsignors();
      await fetchRates();
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Error loading data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRates = async () => {
    try {
      const { data, error } = await supabase
        .from('rates')
        .select(`
          *,
          branches!rates_branch_id_fkey (branch_name, branch_code),
          cities!rates_city_id_fkey (city_name, city_code),
          consignors!rates_consignor_id_fkey (company_name)
        `)
        .order('id');

      if (error) {
        console.error('Error in fetchRates:', error);
        // Fallback to basic query without joins
        const { data: basicData, error: basicError } = await supabase
          .from('rates')
          .select('*')
          .order('id');
        
        if (basicError) throw basicError;
        
        // Manually fetch related data
        const ratesWithDetails = await Promise.all(basicData.map(async (rate) => {
          const [branchRes, cityRes, consignorRes] = await Promise.all([
            supabase.from('branches').select('branch_name, branch_code').eq('id', rate.branch_id).single(),
            supabase.from('cities').select('city_name, city_code').eq('id', rate.city_id).single(),
            rate.consignor_id ? supabase.from('consignors').select('company_name').eq('id', rate.consignor_id).single() : { data: null }
          ]);
          
          return {
            ...rate,
            branches: branchRes.data,
            cities: cityRes.data,
            consignors: consignorRes.data
          };
        }));
        
        setRates(ratesWithDetails || []);
        return;
      }
      
      setRates(data || []);
    } catch (error) {
      console.error('Error fetching rates:', error);
      setRates([]);
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

  const fetchCities = async () => {
    const { data, error } = await supabase
      .from('cities')
      .select('*')
      .order('city_name');

    if (error) throw error;
    setCities(data || []);
  };

  const fetchConsignors = async () => {
    const { data, error } = await supabase
      .from('consignors')
      .select('*')
      .order('company_name');

    if (error) throw error;
    setConsignors(data || []);
  };

  const filterRates = () => {
    if (!searchTerm.trim()) {
      setFilteredRates(rates);
      return;
    }

    const filtered = rates.filter(rate => {
      const searchLower = searchTerm.toLowerCase();
      return (
        rate.branches?.branch_name?.toLowerCase().includes(searchLower) ||
        rate.branches?.branch_code?.toLowerCase().includes(searchLower) ||
        rate.cities?.city_name?.toLowerCase().includes(searchLower) ||
        rate.cities?.city_code?.toLowerCase().includes(searchLower) ||
        rate.consignors?.company_name?.toLowerCase().includes(searchLower) ||
        rate.rate.toString().includes(searchLower)
      );
    });

    setFilteredRates(filtered);
  };

  const handleConsignorChange = (consignorId) => {
    setFormData({
      ...formData,
      consignor_id: consignorId,
      is_default: !consignorId // true if no consignor, false if consignor selected
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.branch_id || !formData.city_id || !formData.rate) {
      alert('Please fill all required fields');
      return;
    }

    try {
      setLoading(true);

      const rateData = {
        branch_id: formData.branch_id,
        city_id: formData.city_id,
        consignor_id: formData.consignor_id || null,
        rate: parseFloat(formData.rate),
        is_default: !formData.consignor_id // true if no consignor, false if consignor selected
      };

      if (editingId) {
        const { error } = await supabase
          .from('rates')
          .update(rateData)
          .eq('id', editingId);

        if (error) throw error;
        alert('Rate updated successfully!');
      } else {
        const { error } = await supabase
          .from('rates')
          .insert([rateData]);

        if (error) throw error;
        alert('Rate added successfully!');
      }

      setFormData({
        branch_id: '',
        city_id: '',
        consignor_id: '',
        rate: '',
        is_default: false
      });
      setEditingId(null);
      fetchRates();
    } catch (error) {
      console.error('Error saving rate:', error);
      alert('Error saving rate: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (rate) => {
    setFormData({
      branch_id: rate.branch_id,
      city_id: rate.city_id,
      consignor_id: rate.consignor_id || '',
      rate: rate.rate.toString(),
      is_default: rate.is_default
    });
    setEditingId(rate.id);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this rate?')) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('rates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('Rate deleted successfully!');
      fetchRates();
    } catch (error) {
      console.error('Error deleting rate:', error);
      alert('Error deleting rate: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setFormData({
      branch_id: '',
      city_id: '',
      consignor_id: '',
      rate: '',
      is_default: false
    });
    setEditingId(null);
  };

  const downloadCSV = () => {
    const dataToExport = searchTerm && filteredRates.length > 0 ? filteredRates : rates;
    
    if (dataToExport.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = ['Branch', 'City', 'Consignor', 'Rate', 'Is Default'];
    const csvContent = [
      headers.join(','),
      ...dataToExport.map(rate => [
        `"${rate.branches?.branch_name || 'N/A'}"`,
        `"${rate.cities?.city_name || 'N/A'}"`,
        `"${rate.consignors?.company_name || 'Default Rate'}"`,
        rate.rate,
        rate.is_default ? 'Yes' : 'No'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `rates_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alert(`Exported ${dataToExport.length} rates to CSV`);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-black">Manage Rates</h2>
        <button
          onClick={downloadCSV}
          className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center gap-2"
        >
          📥 Download CSV
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
          placeholder="Search by branch, city, consignor, or rate..."
        />
      </div>
      
      {/* Add/Edit Form */}
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Branch *
            </label>
            <select
              value={formData.branch_id}
              onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              disabled={loading}
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
              disabled={loading}
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
              Consignor (Optional)
            </label>
            <select
              value={formData.consignor_id}
              onChange={(e) => handleConsignorChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              disabled={loading}
            >
              <option value="">Default Rate (No Consignor)</option>
              {consignors.map((consignor) => (
                <option key={consignor.id} value={consignor.id}>
                  {consignor.company_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rate *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.rate}
              onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="Enter rate"
              disabled={loading}
              required
            />
          </div>

          <div className="flex items-center">
            <div className="mt-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={!formData.consignor_id}
                  readOnly
                  className="mr-2"
                  disabled
                />
                <span className="text-sm text-gray-600">
                  {!formData.consignor_id ? 'Default Rate' : 'Consignor Specific Rate'}
                </span>
              </label>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Saving...' : editingId ? 'Update Rate' : 'Add Rate'}
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
      </form>

      {/* Rates List */}
      <div className="overflow-x-auto">
        <table className="min-w-full table-auto border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="border px-4 py-2 text-left font-bold text-black">Branch</th>
              <th className="border px-4 py-2 text-left font-bold text-black">City</th>
              <th className="border px-4 py-2 text-left font-bold text-black">Consignor</th>
              <th className="border px-4 py-2 text-left font-bold text-black">Rate</th>
              <th className="border px-4 py-2 text-left font-bold text-black">Type</th>
              <th className="border px-4 py-2 text-left font-bold text-black">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRates.length > 0 ? filteredRates.map((rate) => (
              <tr key={rate.id} className="hover:bg-gray-50">
                <td className="border px-4 py-2 text-black">
                  {rate.branches?.branch_name} ({rate.branches?.branch_code})
                </td>
                <td className="border px-4 py-2 text-black">
                  {rate.cities?.city_name} ({rate.cities?.city_code})
                </td>
                <td className="border px-4 py-2 text-black">
                  {rate.consignors?.company_name || 'Default Rate'}
                </td>
                <td className="border px-4 py-2 text-black">₹{rate.rate}</td>
                <td className="border px-4 py-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    rate.is_default 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {rate.is_default ? 'Default' : 'Specific'}
                  </span>
                </td>
                <td className="border px-4 py-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(rate)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                      disabled={loading}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(rate.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                      disabled={loading}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="6" className="border px-4 py-8 text-center text-gray-500">
                  {loading ? 'Loading rates...' : 
                   searchTerm ? 'No rates found matching your search.' : 
                   'No rates found. Add your first rate above.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {searchTerm && (
        <div className="mt-4 text-sm text-black">
          Showing {filteredRates.length} of {rates.length} rates
          {rates.length > 0 && (
            <button 
              onClick={() => console.log('Current rates data:', rates)}
              className="ml-4 text-blue-600 underline text-xs"
            >
              Debug: Log rates data
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default RatesComponent;