'use client';

import { useEffect, useState, useCallback, useMemo, memo } from 'react';
import { useAuth } from '../../app/utils/auth';
import supabase from '../../app/utils/supabase';

// Inline Editable Rate Cell Component
const InlineRateCell = memo(({ city, rate, branchId, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(rate?.rate?.toString() || '');
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Sync value when rate changes externally
  useEffect(() => {
    setValue(rate?.rate?.toString() || '');
  }, [rate?.rate]);

  const handleSave = async () => {
    if (!branchId) {
      alert('Please select a branch first');
      return;
    }

    const numericValue = parseFloat(value);
    if (isNaN(numericValue) || numericValue < 0) {
      alert('Please enter a valid rate');
      return;
    }

    setSaving(true);
    try {
      await onUpdate(city.id, numericValue, rate?.id);
      setIsEditing(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1500);
    } catch (error) {
      alert('Error saving rate: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setValue(rate?.rate?.toString() || '');
      setIsEditing(false);
    }
  };

  const handleBlur = () => {
    // Only save if value changed
    if (value !== (rate?.rate?.toString() || '')) {
      if (value.trim() === '') {
        setValue(rate?.rate?.toString() || '');
        setIsEditing(false);
      } else {
        handleSave();
      }
    } else {
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-gray-500">₹</span>
        <input
          type="number"
          step="0.01"
          min="0"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          autoFocus
          className="w-20 px-2 py-1 border border-blue-500 rounded text-black text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={saving}
        />
        {saving && <span className="text-xs text-gray-500">...</span>}
      </div>
    );
  }

  return (
    <div 
      className={`cursor-pointer px-2 py-1 rounded transition-all duration-200 min-w-[80px] ${
        showSuccess 
          ? 'bg-green-100 text-green-700' 
          : rate?.rate 
            ? 'hover:bg-blue-50 text-green-700 font-bold' 
            : 'hover:bg-gray-100 text-gray-400'
      }`}
      onClick={() => setIsEditing(true)}
      title="Click to edit rate"
    >
      {showSuccess ? (
        <span className="flex items-center gap-1">
          <span>✓</span>
          <span>₹{value}</span>
        </span>
      ) : rate?.rate ? (
        <span>₹{rate.rate}</span>
      ) : (
        <span className="text-xs">Click to add</span>
      )}
    </div>
  );
});

InlineRateCell.displayName = 'InlineRateCell';

const RatesComponent = () => {
  const { user } = useAuth();
  
  // State
  const [citiesWithRates, setCitiesWithRates] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Search
  const [searchTerm, setSearchTerm] = useState('');
  
  // Sorting
  const [sortConfig, setSortConfig] = useState({ key: 'city_name', direction: 'asc' });

  // Fetch all cities and rates
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [branchesRes, citiesRes, ratesRes] = await Promise.all([
        supabase.from('branches').select('*').eq('is_active', true).order('branch_name'),
        supabase.from('cities').select('*').order('city_name'),
        supabase.from('rates')
          .select('*')
          .is('consignor_id', null)
          .eq('is_default', true)
      ]);

      setBranches(branchesRes.data || []);
      
      // Create a map of rates by city_id and branch_id
      const ratesMap = {};
      (ratesRes.data || []).forEach(rate => {
        const key = `${rate.city_id}-${rate.branch_id}`;
        ratesMap[key] = rate;
      });

      // Merge cities with their rates
      const citiesData = (citiesRes.data || []).map(city => ({
        ...city,
        ratesMap // Store the entire rates map for this city
      }));

      setCitiesWithRates(citiesData);
      
      // Set default branch from user or first branch
      if (user?.branch_id) {
        setSelectedBranch(user.branch_id);
      } else if (branchesRes.data?.length > 0) {
        setSelectedBranch(branchesRes.data[0].id);
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

  // Get rate for a city based on selected branch
  const getRateForCity = useCallback((city) => {
    if (!selectedBranch) return null;
    const key = `${city.id}-${selectedBranch}`;
    return city.ratesMap?.[key] || null;
  }, [selectedBranch]);

  // Handle rate update (optimistic update)
  const handleRateUpdate = useCallback(async (cityId, newRate, existingRateId) => {
    const rateData = {
      branch_id: selectedBranch,
      city_id: cityId,
      consignor_id: null,
      rate: newRate,
      is_default: true
    };

    if (existingRateId) {
      // Update existing rate
      const { data, error } = await supabase
        .from('rates')
        .update({ rate: newRate })
        .eq('id', existingRateId)
        .select()
        .single();
      
      if (error) throw error;

      // Optimistic update
      setCitiesWithRates(prev => prev.map(city => {
        if (city.id === cityId) {
          const key = `${cityId}-${selectedBranch}`;
          return {
            ...city,
            ratesMap: {
              ...city.ratesMap,
              [key]: data
            }
          };
        }
        return city;
      }));
    } else {
      // Insert new rate
      const { data, error } = await supabase
        .from('rates')
        .insert([rateData])
        .select()
        .single();
      
      if (error) throw error;

      // Optimistic update
      setCitiesWithRates(prev => prev.map(city => {
        if (city.id === cityId) {
          const key = `${cityId}-${selectedBranch}`;
          return {
            ...city,
            ratesMap: {
              ...city.ratesMap,
              [key]: data
            }
          };
        }
        return city;
      }));
    }
  }, [selectedBranch]);

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

  // Filtered and sorted cities
  const filteredAndSortedCities = useMemo(() => {
    let result = [...citiesWithRates];
    
    // Filter by search term
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      result = result.filter(city => 
        city.city_name?.toLowerCase().includes(search) ||
        city.city_code?.toLowerCase().includes(search)
      );
    }
    
    // Sort
    result.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortConfig.key) {
        case 'city_name':
          aValue = a.city_name || '';
          bValue = b.city_name || '';
          break;
        case 'city_code':
          aValue = a.city_code || '';
          bValue = b.city_code || '';
          break;
        case 'rate':
          const aRate = getRateForCity(a);
          const bRate = getRateForCity(b);
          aValue = parseFloat(aRate?.rate) || 0;
          bValue = parseFloat(bRate?.rate) || 0;
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
  }, [citiesWithRates, searchTerm, sortConfig, getRateForCity]);

  // Count cities with rates
  const citiesWithRatesCount = useMemo(() => {
    return filteredAndSortedCities.filter(city => getRateForCity(city)?.rate).length;
  }, [filteredAndSortedCities, getRateForCity]);

  // Download CSV
  const downloadCSV = () => {
    const selectedBranchData = branches.find(b => b.id === selectedBranch);
    const headers = ['City', 'City Code', 'Rate (₹/kg)'];
    const rows = filteredAndSortedCities.map(city => {
      const rate = getRateForCity(city);
      return [
        city.city_name || '',
        city.city_code || '',
        rate?.rate || ''
      ];
    });
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rates-${selectedBranchData?.branch_code || 'all'}-${new Date().toISOString().split('T')[0]}.csv`;
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

      {/* Branch Selection */}
      <div className="mb-6 bg-blue-50 p-4 rounded-lg">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Branch to Manage Rates
        </label>
        <select
          value={selectedBranch}
          onChange={(e) => setSelectedBranch(e.target.value)}
          className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
        >
          <option value="">Select Branch</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.branch_name} ({branch.branch_code})
            </option>
          ))}
        </select>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by city name or code..."
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
            Found {filteredAndSortedCities.length} cities matching "{searchTerm}"
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="mb-4 flex gap-4 text-sm text-gray-600">
        <span>Total Cities: {filteredAndSortedCities.length}</span>
        <span>|</span>
        <span className="text-green-600">With Rates: {citiesWithRatesCount}</span>
        <span>|</span>
        <span className="text-orange-600">Without Rates: {filteredAndSortedCities.length - citiesWithRatesCount}</span>
      </div>

      {/* Info */}
      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
        💡 <strong>Tip:</strong> Click on any rate cell to edit it directly. Press Enter to save or Escape to cancel.
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full table-auto border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-4 py-3 text-left font-bold text-black w-16">#</th>
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
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedCities.length > 0 ? (
              filteredAndSortedCities.map((city, index) => {
                const rate = getRateForCity(city);
                return (
                  <tr key={city.id} className="hover:bg-gray-50">
                    <td className="border px-4 py-2 text-gray-500 text-sm">
                      {index + 1}
                    </td>
                    <td className="border px-4 py-2 text-black font-medium">
                      {city.city_name}
                    </td>
                    <td className="border px-4 py-2 text-black">
                      {city.city_code}
                    </td>
                    <td className="border px-4 py-2">
                      <InlineRateCell
                        city={city}
                        rate={rate}
                        branchId={selectedBranch}
                        onUpdate={handleRateUpdate}
                      />
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="4" className="border px-4 py-8 text-center text-gray-500">
                  {searchTerm ? `No cities found matching "${searchTerm}"` : 'No cities found.'}
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