'use client';

import { useEffect } from 'react';
import { useAuth } from '../../app/utils/auth';
import { useRatesManager } from './rates-manager-helper';

const RatesComponent = () => {
  const { user } = useAuth();
  const {
    // State
    rates,
    filteredRates,
    branches,
    cities,
    consignors,
    loading,
    dataLoading,
    searchLoading,
    exportLoading,
    submitLoading,
    
    // Search state
    searchTerm,
    searchFilter,
    isSearching,
    
    // Pagination
    currentPage,
    totalPages,
    totalRates,
    startItem,
    endItem,
    
    // Form state
    formData,
    editingId,
    
    // Functions
    fetchStaticData,
    fetchRates,
    handleSearchChange,
    handleFilterChange,
    clearSearch,
    handleConsignorChange,
    handleSubmit,
    handleEdit,
    handleDelete,
    cancelEdit,
    downloadCSV,
    goToPage,
    setFormData
  } = useRatesManager();

  useEffect(() => {
    fetchStaticData();
  }, [fetchStaticData]);

  useEffect(() => {
    if (!dataLoading) {
      fetchRates();
    }
  }, [fetchRates, dataLoading]);

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxPagesToShow = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    
    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => goToPage(i)}
          className={`px-3 py-1 mx-1 rounded ${
            currentPage === i
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {i}
        </button>
      );
    }

    return (
      <div className="flex items-center justify-center mt-4 space-x-2">
        <button
          onClick={() => goToPage(1)}
          disabled={currentPage === 1}
          className="px-3 py-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50"
        >
          First
        </button>
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50"
        >
          Previous
        </button>
        {pages}
        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50"
        >
          Next
        </button>
        <button
          onClick={() => goToPage(totalPages)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50"
        >
          Last
        </button>
      </div>
    );
  };

  if (dataLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Loading rates manager...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-black">Manage Rates</h2>
        <button
          onClick={downloadCSV}
          disabled={exportLoading || dataLoading}
          className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          📥 {exportLoading ? 'Exporting...' : 'Download CSV'}
        </button>
      </div>

      {/* Enhanced Search Section */}
      <div className="mb-6 bg-gray-50 p-4 rounded-lg">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
          {/* Search Input */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Rates
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                placeholder="Search by branch, city, consignor, or rate amount..."
                disabled={searchLoading}
              />
              {searchLoading && (
                <div className="absolute right-3 top-2.5">
                  <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                </div>
              )}
              {searchTerm && !searchLoading && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Filter Options */}
          <div className="flex flex-col md:flex-row gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter Type
              </label>
              <select
                value={searchFilter}
                onChange={(e) => handleFilterChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
                disabled={searchLoading}
              >
                <option value="all">All Rates</option>
                <option value="default">Default Rates Only</option>
                <option value="consignor">Consignor Specific Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Search Status */}
        {isSearching && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center justify-between">
              <div className="text-sm text-blue-800">
                <span className="font-medium">Search Results:</span> 
                {searchLoading ? ' Searching...' : ` Found ${filteredRates.length} rates matching "${searchTerm}"`}
                {searchFilter !== 'all' && (
                  <span className="ml-2 px-2 py-1 bg-blue-100 rounded-full text-xs">
                    {searchFilter === 'default' ? 'Default Rates' : 'Consignor Specific'}
                  </span>
                )}
              </div>
              <button
                onClick={clearSearch}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Clear Search
              </button>
            </div>
          </div>
        )}
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
              disabled={submitLoading}
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
              disabled={submitLoading}
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
              disabled={submitLoading}
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
              disabled={submitLoading}
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
            disabled={submitLoading}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            {submitLoading ? 'Saving...' : (editingId ? 'Update Rate' : 'Add Rate')}
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

      {/* Pagination Info - Only show when not searching */}
      {!isSearching && totalRates > 0 && (
        <div className="mb-4 text-sm text-gray-600">
          Showing {startItem} to {endItem} of {totalRates} rates
        </div>
      )}

      {/* Rates Table */}
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
            {loading ? (
              <tr>
                <td colSpan="6" className="border px-4 py-8 text-center text-gray-500">
                  Loading rates...
                </td>
              </tr>
            ) : (
              // Show filtered rates when searching, otherwise show paginated rates
              (isSearching ? filteredRates : rates).length > 0 ? 
              (isSearching ? filteredRates : rates).map((rate) => (
                <tr key={rate.id} className="hover:bg-gray-50">
                  <td className="border px-4 py-2 text-black">
                    {rate.branches?.branch_name || 'N/A'} ({rate.branches?.branch_code || 'N/A'})
                  </td>
                  <td className="border px-4 py-2 text-black">
                    {rate.cities?.city_name || 'N/A'} ({rate.cities?.city_code || 'N/A'})
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
                        disabled={submitLoading}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(rate.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                        disabled={submitLoading}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" className="border px-4 py-8 text-center text-gray-500">
                    {isSearching ? 
                      `No rates found matching "${searchTerm}"${searchFilter !== 'all' ? ` in ${searchFilter} rates` : ''}` : 
                      'No rates found. Add your first rate above.'}
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination - Only show when not searching */}
      {!isSearching && renderPagination()}
    </div>
  );
};

export default RatesComponent;