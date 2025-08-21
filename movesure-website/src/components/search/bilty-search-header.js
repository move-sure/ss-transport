'use client';

import React from 'react';
import { Search, RefreshCw, Download, FileText, TrendingUp, Filter, CheckSquare, Copy } from 'lucide-react';

const BiltySearchHeader = ({ 
  stats, 
  loading, 
  searchLoading, 
  error, 
  onRefresh, 
  selectedCount, 
  onExport,
  selectedBilties,
  filteredBilties,
  filteredStationBilties,
  cities,
  branchData,
  isFiltered,
  hasMore,
  onLoadMore,
  loadingMore
}) => {
  
  // Helper function to get city name
  const getCityName = (cityId) => {
    const city = cities?.find(c => c.id?.toString() === cityId?.toString());
    return city ? city.city_name : 'N/A';
  };

  // Copy function for tab-separated format (Excel-friendly)
  const handleCopy = () => {
    if (selectedBilties.size === 0) {
      alert('Please select bilties to copy');
      return;
    }
    
    const selectedRegularBilties = filteredBilties.filter(b => selectedBilties.has(b.id));
    const selectedStationBilties = filteredStationBilties.filter(b => selectedBilties.has(b.id));
    const allSelectedBilties = [...selectedRegularBilties, ...selectedStationBilties];
    
    const headers = [
      'SN.NO',
      'GR_NO',
      'CONSIGNOR',
      'CONSIGNEE',
      'CONTENT',
      'NO_OF_PACKAGES',
      'WEIGHT',
      'TO_PAY',
      'PAID',
      'STATION',
      'PVT_MARK',
      'DATE'
    ];
    
    const tabContent = [
      headers.join('\t'),
      ...allSelectedBilties.map((bilty, index) => [
        index + 1, // SN.NO
        bilty.gr_no || 'N/A',
        bilty.bilty_type === 'station' 
          ? (bilty.consignor || 'N/A') 
          : (bilty.consignor_name || 'N/A'),
        bilty.bilty_type === 'station' 
          ? (bilty.consignee || 'N/A') 
          : (bilty.consignee_name || 'N/A'),
        bilty.bilty_type === 'station' 
          ? (bilty.contents || 'N/A') 
          : (bilty.contain || 'N/A'),
        bilty.bilty_type === 'station' 
          ? (bilty.no_of_packets || 0) 
          : (bilty.no_of_pkg || 0),
        bilty.bilty_type === 'station' 
          ? (bilty.weight || 0) 
          : (bilty.wt || 0),
        // TO_PAY column
        bilty.bilty_type === 'station' 
          ? (bilty.payment_status === 'to-pay' ? (bilty.amount || 0) : 0)
          : (bilty.payment_mode === 'to-pay' ? (bilty.total || 0) : 0),
        // PAID column
        bilty.bilty_type === 'station' 
          ? (bilty.payment_status === 'paid' ? (bilty.amount || 0) : 0)
          : (bilty.payment_mode === 'paid' ? (bilty.total || 0) : 0),
        bilty.bilty_type === 'station' 
          ? (bilty.station || 'N/A') 
          : getCityName(bilty.to_city_id),
        bilty.pvt_marks || 'N/A',
        // DATE column - use created_at for station bilties, bilty_date for regular bilties
        bilty.bilty_type === 'station' 
          ? (bilty.created_at ? new Date(bilty.created_at).toLocaleDateString('en-GB') : 'N/A')
          : (bilty.bilty_date ? new Date(bilty.bilty_date).toLocaleDateString('en-GB') : 'N/A')
      ].join('\t'))
    ].join('\n');
    
    // Copy to clipboard
    navigator.clipboard.writeText(tabContent).then(() => {
      alert(`Successfully copied ${allSelectedBilties.length} bilty records to clipboard! You can now paste this data into Excel.`);
    }).catch(err => {
      console.error('Failed to copy: ', err);
      alert('Failed to copy data to clipboard. Please try again.');
    });
  };
  return (
    <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-900 rounded-2xl shadow-2xl p-6">
      {/* Main Header */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-4">
          <div className="bg-blue-500 p-3 rounded-xl shadow-lg">
            <Search className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Bilty Search & Export</h1>
            <p className="text-slate-300 mt-1">Advanced search with multi-filter options</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Copy Button */}
          <button
            onClick={handleCopy}
            disabled={selectedCount === 0}
            className={`px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg ${
              selectedCount > 0
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white'
                : 'bg-slate-600 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Copy className="w-5 h-5" />
            Copy ({selectedCount})
          </button>

          {/* Export Button */}
          <button
            onClick={onExport}
            disabled={selectedCount === 0}
            className={`px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg ${
              selectedCount > 0
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white'
                : 'bg-slate-600 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Download className="w-5 h-5" />
            Export ({selectedCount})
          </button>
          
          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="px-4 py-3 bg-slate-600 hover:bg-slate-500 text-white rounded-xl font-semibold transition-all shadow-lg flex items-center gap-2"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {/* Load More Button */}
          {!isFiltered && hasMore && (
            <button
              onClick={onLoadMore}
              disabled={loadingMore}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl font-semibold transition-all shadow-lg flex items-center gap-2"
            >
              {loadingMore ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Download className="w-5 h-5" />
              )}
              {loadingMore ? 'Loading...' : 'Load More'}
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Total Bilties */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Bilties</p>
              <p className="text-2xl font-bold">
                {loading ? (
                  <div className="animate-pulse bg-blue-400 h-8 w-16 rounded"></div>
                ) : (
                  stats.total.toLocaleString()
                )}
              </p>
            </div>
            <FileText className="w-8 h-8 text-blue-200" />
          </div>
        </div>

        {/* Filtered Results */}
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-4 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-100 text-sm font-medium">Filtered</p>
              <p className="text-2xl font-bold">
                {searchLoading ? (
                  <div className="animate-pulse bg-indigo-400 h-8 w-16 rounded"></div>
                ) : (
                  stats.filtered.toLocaleString()
                )}
              </p>
            </div>
            <Filter className="w-8 h-8 text-indigo-200" />
          </div>
        </div>

        {/* Selected */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm font-medium">Selected</p>
              <p className="text-2xl font-bold">{stats.selected.toLocaleString()}</p>
            </div>
            <CheckSquare className="w-8 h-8 text-emerald-200" />
          </div>
        </div>

        {/* Total Amount */}
        <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl p-4 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-100 text-sm font-medium">Total Amount</p>
              <p className="text-xl font-bold">
                {loading ? (
                  <div className="animate-pulse bg-amber-400 h-6 w-20 rounded"></div>
                ) : (
                  `₹${stats.totalAmount.toLocaleString()}`
                )}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-amber-200" />
          </div>
        </div>

        {/* Selected Amount */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Selected Amount</p>
              <p className="text-xl font-bold">₹{stats.selectedAmount.toLocaleString()}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-200" />
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-4 bg-red-500 bg-opacity-10 border border-red-500 border-opacity-20 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="bg-red-500 p-2 rounded-lg">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-red-400 font-semibold">Error Loading Data</h3>
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Search Status */}
      {searchLoading && (
        <div className="mt-4 bg-blue-500 bg-opacity-10 border border-blue-500 border-opacity-20 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
            <span className="text-blue-300 font-medium">Applying filters...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default BiltySearchHeader;