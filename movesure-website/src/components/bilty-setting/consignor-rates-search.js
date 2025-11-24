'use client';

import { useEffect, useRef } from 'react';
import { useConsignorRatesSearch } from './consignor-rates-search-helper';
import RecentBiltiesByCity from './recent-bilties-by-city';

const ConsignorRatesSearch = () => {
  const {
    consignors,
    filteredConsignors,
    searchInput,
    selectedConsignor,
    consignorRates,
    loading,
    showSuggestions,
    dataLoading,
    editingId,
    editRate,
    compareMode,
    compareConsignor,
    compareRates,
    compareSearchInput,
    compareFilteredConsignors,
    showCompareSuggestions,
    compareLoading,
    fetchConsignors,
    handleSearchInput,
    handleCompareSearchInput,
    selectConsignor,
    selectCompareConsignor,
    startEdit,
    cancelEdit,
    saveEdit,
    deleteRate,
    clearSearch,
    clearComparison,
    enableCompareMode,
    downloadConsignorRatesCSV,
    downloadComparisonCSV,
    setShowSuggestions,
    setShowCompareSuggestions,
    setEditRate
  } = useConsignorRatesSearch();

  const searchRef = useRef(null);
  const compareSearchRef = useRef(null);

  useEffect(() => {
    fetchConsignors();
  }, [fetchConsignors]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
      if (compareSearchRef.current && !compareSearchRef.current.contains(event.target)) {
        setShowCompareSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);



  if (dataLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
        <p className="ml-4 text-gray-600">Loading consignors...</p>
      </div>
    );
  }

  if (consignors.length === 0 && !dataLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Consignors Found</h3>
          <p className="text-gray-600">Please add consignors in the Consignors tab first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Search Rates by Company</h2>
          <div className="flex gap-2">
            {selectedConsignor && consignorRates.length > 0 && !compareMode && (
              <button
                onClick={enableCompareMode}
                className="bg-purple-500 text-white px-4 py-2 rounded-md hover:bg-purple-600 flex items-center gap-2 text-sm"
              >
                🔄 Compare
              </button>
            )}
            {compareMode && compareConsignor && (
              <button
                onClick={downloadComparisonCSV}
                className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 flex items-center gap-2 text-sm"
              >
                📥 Download Comparison
              </button>
            )}
            {selectedConsignor && consignorRates.length > 0 && (
              <button
                onClick={downloadConsignorRatesCSV}
                className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center gap-2 text-sm"
              >
                📥 Download CSV
              </button>
            )}
          </div>
        </div>
        <p className="text-gray-600 text-sm">
          Search for a company to view all cities and rates where they have dealt
        </p>
      </div>

      {/* Search Input with Autocomplete */}
      <div className="mb-6 relative" ref={searchRef}>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Search Consignor/Company
        </label>
        <div className="relative">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchInput(e.target.value)}
            onFocus={() => searchInput && setShowSuggestions(true)}
            placeholder="Type company name or contact person..."
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
          />
          {searchInput && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          )}
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && filteredConsignors.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {filteredConsignors.map((consignor) => (
              <div
                key={consignor.id}
                onClick={() => selectConsignor(consignor)}
                className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
              >
                <div className="font-medium text-gray-900">{consignor.company_name}</div>
                {consignor.contact_person && (
                  <div className="text-sm text-gray-600">Contact: {consignor.contact_person}</div>
                )}
                {consignor.phone && (
                  <div className="text-xs text-gray-500">{consignor.phone}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {showSuggestions && searchInput && filteredConsignors.length === 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-center text-gray-500">
            No consignors found matching "{searchInput}"
          </div>
        )}
      </div>

      {/* Comparison Mode */}
      {compareMode && selectedConsignor && (
        <div className="mb-6 bg-purple-50 border-2 border-purple-300 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-purple-900">🔄 Compare with Another Company</h3>
            <button
              onClick={clearComparison}
              className="text-purple-600 hover:text-purple-800 text-sm font-medium"
            >
              ✕ Cancel Comparison
            </button>
          </div>
          
          <div className="relative" ref={compareSearchRef}>
            <input
              type="text"
              value={compareSearchInput}
              onChange={(e) => handleCompareSearchInput(e.target.value)}
              onFocus={() => compareSearchInput && setShowCompareSuggestions(true)}
              placeholder="Search another company to compare..."
              className="w-full px-4 py-2 border-2 border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-black"
            />
            
            {showCompareSuggestions && compareFilteredConsignors.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {compareFilteredConsignors.map((consignor) => (
                  <div
                    key={consignor.id}
                    onClick={() => selectCompareConsignor(consignor)}
                    className="px-4 py-3 hover:bg-purple-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium text-gray-900">{consignor.company_name}</div>
                    {consignor.contact_person && (
                      <div className="text-sm text-gray-600">Contact: {consignor.contact_person}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected Consignor Info */}
      {selectedConsignor && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-blue-900">{selectedConsignor.company_name}</h3>
              {selectedConsignor.contact_person && (
                <p className="text-sm text-blue-700">Contact: {selectedConsignor.contact_person}</p>
              )}
              {selectedConsignor.phone && (
                <p className="text-sm text-blue-700">Phone: {selectedConsignor.phone}</p>
              )}
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-900">{consignorRates.length}</div>
              <div className="text-sm text-blue-700">Total Rates</div>
            </div>
          </div>
        </div>
      )}

      {/* Compare Consignor Info */}
      {compareConsignor && (
        <div className="mb-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-purple-900">{compareConsignor.company_name}</h3>
              {compareConsignor.contact_person && (
                <p className="text-sm text-purple-700">Contact: {compareConsignor.contact_person}</p>
              )}
              {compareConsignor.phone && (
                <p className="text-sm text-purple-700">Phone: {compareConsignor.phone}</p>
              )}
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-purple-900">{compareRates.length}</div>
              <div className="text-sm text-purple-700">Total Rates</div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading rates...</p>
          </div>
        </div>
      )}

      {/* Rates Table or Comparison Table */}
      {!loading && selectedConsignor && (
        <div className="overflow-x-auto">
          {consignorRates.length > 0 ? (
            compareMode && compareConsignor ? (
              // Comparison Table
              <table className="min-w-full table-auto border-collapse text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-50 to-purple-50">
                    <th className="border border-gray-300 px-3 py-1.5 text-left font-semibold text-gray-900">City</th>
                    <th className="border border-gray-300 px-3 py-1.5 text-left font-semibold text-gray-900">Code</th>
                    <th className="border border-gray-300 px-3 py-1.5 text-right font-semibold text-blue-900">{selectedConsignor.company_name}</th>
                    <th className="border border-gray-300 px-3 py-1.5 text-right font-semibold text-purple-900">{compareConsignor.company_name}</th>
                    <th className="border border-gray-300 px-3 py-1.5 text-right font-semibold text-gray-900">Difference</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const allCities = new Map();
                    consignorRates.forEach(rate => {
                      if (rate.city) allCities.set(rate.city.id, rate.city);
                    });
                    compareRates.forEach(rate => {
                      if (rate.city) allCities.set(rate.city.id, rate.city);
                    });
                    
                    return Array.from(allCities.values())
                      .sort((a, b) => a.city_name.localeCompare(b.city_name))
                      .map((city, index) => {
                        const rate1 = consignorRates.find(r => r.city_id === city.id);
                        const rate2 = compareRates.find(r => r.city_id === city.id);
                        const r1 = rate1 ? parseFloat(rate1.rate) : null;
                        const r2 = rate2 ? parseFloat(rate2.rate) : null;
                        const diff = r1 && r2 ? r1 - r2 : null;
                        
                        return (
                          <tr key={city.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="border border-gray-300 px-3 py-1.5 text-gray-900">{city.city_name}</td>
                            <td className="border border-gray-300 px-3 py-1.5 text-gray-700">{city.city_code}</td>
                            <td className="border border-gray-300 px-3 py-1.5 text-right font-semibold text-blue-600">
                              {r1 ? `₹${r1.toFixed(2)}` : '-'}
                            </td>
                            <td className="border border-gray-300 px-3 py-1.5 text-right font-semibold text-purple-600">
                              {r2 ? `₹${r2.toFixed(2)}` : '-'}
                            </td>
                            <td className={`border border-gray-300 px-3 py-1.5 text-right font-semibold ${
                              diff === null ? 'text-gray-400' : diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-600'
                            }`}>
                              {diff !== null ? `₹${diff.toFixed(2)}` : '-'}
                            </td>
                          </tr>
                        );
                      });
                  })()}
                </tbody>
              </table>
            ) : (
              // Single Company Table
              <table className="min-w-full table-auto border-collapse text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-50 to-indigo-50">
                    <th className="border border-gray-300 px-3 py-1.5 text-left font-semibold text-gray-900">City</th>
                    <th className="border border-gray-300 px-3 py-1.5 text-left font-semibold text-gray-900">City Code</th>
                    <th className="border border-gray-300 px-3 py-1.5 text-right font-semibold text-gray-900">Rate</th>
                    <th className="border border-gray-300 px-3 py-1.5 text-center font-semibold text-gray-900">Recent Bilties</th>
                    <th className="border border-gray-300 px-3 py-1.5 text-center font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {consignorRates.map((rate, index) => (
                    <tr key={rate.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-300 px-3 py-1.5 text-gray-900">
                        {rate.city?.city_name || 'N/A'}
                      </td>
                      <td className="border border-gray-300 px-3 py-1.5 text-gray-700">
                        {rate.city?.city_code || 'N/A'}
                      </td>
                      <td className="border border-gray-300 px-3 py-1.5 text-right">
                        {editingId === rate.id ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editRate}
                            onChange={(e) => setEditRate(e.target.value)}
                            className="w-20 px-2 py-1 border border-blue-400 rounded text-right"
                            autoFocus
                          />
                        ) : (
                          <span className="font-semibold text-green-600">₹{parseFloat(rate.rate).toFixed(2)}</span>
                        )}
                      </td>
                      <td className="border border-gray-300 px-3 py-1.5 text-center">
                        <RecentBiltiesByCity
                          consignorName={selectedConsignor?.company_name}
                          cityId={rate.city_id}
                          cityName={rate.city?.city_name}
                        />
                      </td>
                      <td className="border border-gray-300 px-3 py-1.5 text-center">
                        {editingId === rate.id ? (
                          <div className="flex justify-center gap-1">
                            <button
                              onClick={() => saveEdit(rate.id)}
                              className="text-green-600 hover:text-green-800 text-xs px-2 py-1"
                              title="Save"
                            >
                              ✓
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="text-red-600 hover:text-red-800 text-xs px-2 py-1"
                              title="Cancel"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-center gap-1">
                            <button
                              onClick={() => startEdit(rate.id, rate.rate)}
                              className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1"
                              title="Edit"
                            >
                              ✎
                            </button>
                            <button
                              onClick={() => deleteRate(rate.id)}
                              className="text-red-600 hover:text-red-800 text-xs px-2 py-1"
                              title="Delete"
                            >
                              🗑
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 font-bold">
                    <td colSpan="2" className="border border-gray-300 px-3 py-1.5 text-right text-gray-900">
                      Average Rate:
                    </td>
                    <td className="border border-gray-300 px-3 py-1.5 text-right text-green-600">
                      ₹{(consignorRates.reduce((sum, rate) => sum + parseFloat(rate.rate), 0) / consignorRates.length).toFixed(2)}
                    </td>
                    <td className="border border-gray-300 px-3 py-1.5"></td>
                    <td className="border border-gray-300 px-3 py-1.5"></td>
                  </tr>
                </tfoot>
              </table>
            )
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-4xl mb-4">📦</div>
              <p className="text-gray-600 text-lg">No rates found for {selectedConsignor.company_name}</p>
              <p className="text-gray-500 text-sm mt-2">This company hasn't dealt with any cities yet.</p>
            </div>
          )}
        </div>
      )}

      {/* Initial State */}
      {!selectedConsignor && !loading && (
        <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border-2 border-dashed border-gray-300">
          <div className="text-6xl mb-4">🔍</div>
          <p className="text-gray-600 text-lg font-medium">Search for a company to view their rates</p>
          <p className="text-gray-500 text-sm mt-2">Start typing in the search box above</p>
        </div>
      )}
    </div>
  );
};

export default ConsignorRatesSearch;
