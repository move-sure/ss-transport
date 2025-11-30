'use client';

import React, { useState, useCallback } from 'react';
import { Search, FileText, Hash, Truck, Calendar, MapPin, CheckCircle, XCircle, AlertTriangle, Loader2, X, Package, Building, User, IndianRupee, ArrowRight, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import supabase from '../../app/utils/supabase';
import { formatEwbNumber } from '../../utils/ewbValidation';
import Link from 'next/link';

export default function EwbSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [expandedResult, setExpandedResult] = useState(null);

  // Format EWB number with hyphens as user types (XXXX-XXXX-XXXX)
  const formatEwbInput = (value) => {
    // Remove all non-numeric characters
    const numbers = value.replace(/\D/g, '');
    
    // Limit to 12 digits
    const limited = numbers.slice(0, 12);
    
    // Add hyphens after every 4 digits
    const parts = [];
    for (let i = 0; i < limited.length; i += 4) {
      parts.push(limited.slice(i, i + 4));
    }
    
    return parts.join('-');
  };

  const handleInputChange = (e) => {
    const formatted = formatEwbInput(e.target.value);
    setSearchQuery(formatted);
  };

  const handleSearch = useCallback(async () => {
    const query = searchQuery.trim();
    if (!query) {
      setError('Please enter an E-Way Bill number to search');
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);
    setExpandedResult(null);

    try {
      // Clean the search query - remove hyphens and spaces
      const cleanQuery = query.replace(/[-\s]/g, '');
      
      // Search in ewb_validations table
      const { data, error: searchError } = await supabase
        .from('ewb_validations')
        .select('*')
        .or(`ewb_number.ilike.%${cleanQuery}%,ewb_number.ilike.%${query}%`)
        .order('validated_at', { ascending: false })
        .limit(20);

      if (searchError) throw searchError;

      setSearchResults(data || []);
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search. Please try again.');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
    setError(null);
    setExpandedResult(null);
  };

  const getEwbDetails = (result) => {
    try {
      const metadata = result.raw_result_metadata;
      if (!metadata?.data?.data?.results?.message) return null;
      return metadata.data.data.results.message;
    } catch {
      return null;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return 'N/A';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Compact Search Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 text-white">
            <Search className="w-5 h-5" />
            <span className="font-semibold text-sm">E-Way Bill Search</span>
          </div>
          <div className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="Enter EWB number (e.g., 4480-0919-5664)"
                maxLength={14}
                className="w-full pl-3 pr-8 py-2 rounded-lg bg-white/95 border-0 text-gray-900 text-sm font-mono placeholder-gray-400 focus:ring-2 focus:ring-white/50 focus:outline-none tracking-wide"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={handleSearch}
              disabled={loading || !searchQuery.trim()}
              className="px-4 py-2 bg-white text-blue-600 font-medium rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm flex items-center gap-1.5"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-100">
          <div className="flex items-center gap-2 text-red-700 text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Search Results */}
      {hasSearched && (
        <div className="max-h-[500px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600 text-sm">Searching...</span>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-8 px-4">
              <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-600 text-sm">No E-Way Bill found matching "{searchQuery}"</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500">
                Found {searchResults.length} result{searchResults.length > 1 ? 's' : ''}
              </div>

              {searchResults.map((result) => {
                const ewbDetails = getEwbDetails(result);
                const isExpanded = expandedResult === result.id;
                
                return (
                  <div key={result.id} className="bg-white hover:bg-gray-50 transition-colors">
                    {/* Compact Result Row */}
                    <div 
                      className="p-3 cursor-pointer"
                      onClick={() => setExpandedResult(isExpanded ? null : result.id)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`p-1.5 rounded-lg flex-shrink-0 ${result.is_valid ? 'bg-green-100' : 'bg-red-100'}`}>
                            {result.is_valid ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-mono font-semibold text-gray-900 text-sm">{formatEwbNumber(result.ewb_number)}</p>
                            <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                              <span className="flex items-center gap-1">
                                <Hash className="w-3 h-3" />
                                GR: {result.gr_no || 'N/A'}
                              </span>
                              <span className="flex items-center gap-1">
                                <FileText className="w-3 h-3" />
                                Challan: {result.challan_no || 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            result.is_valid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {result.is_valid ? 'Valid' : 'Invalid'}
                          </span>
                          <Link
                            href={`/ewb/${result.challan_no}`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                            title="View Challan"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && ewbDetails && (
                      <div className="px-3 pb-3 space-y-3 border-t border-gray-100 bg-gray-50">
                        {/* Quick Info Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-3">
                          <div className="p-2 bg-white rounded-lg border border-gray-100">
                            <p className="text-xs text-gray-500">Distance</p>
                            <p className="font-semibold text-gray-900 text-sm">{ewbDetails.transportation_distance || 'N/A'} km</p>
                          </div>
                          <div className="p-2 bg-white rounded-lg border border-gray-100">
                            <p className="text-xs text-gray-500">Invoice Value</p>
                            <p className="font-semibold text-green-600 text-sm">{formatCurrency(ewbDetails.total_invoice_value)}</p>
                          </div>
                          <div className="p-2 bg-white rounded-lg border border-gray-100">
                            <p className="text-xs text-gray-500">Valid Days</p>
                            <p className="font-semibold text-gray-900 text-sm">{ewbDetails.number_of_valid_days || 'N/A'}</p>
                          </div>
                          <div className="p-2 bg-white rounded-lg border border-gray-100">
                            <p className="text-xs text-gray-500">EWB Date</p>
                            <p className="font-semibold text-gray-900 text-sm">{ewbDetails.eway_bill_date?.split(' ')[0] || 'N/A'}</p>
                          </div>
                        </div>

                        {/* Consignor/Consignee */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div className="p-2 bg-white rounded-lg border border-gray-100">
                            <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                              <Building className="w-3 h-3" /> From (Consignor)
                            </p>
                            <p className="font-medium text-gray-900 text-sm truncate">{ewbDetails.legal_name_of_consignor || 'N/A'}</p>
                            <p className="text-xs text-gray-500">{ewbDetails.place_of_consignor}, {ewbDetails.state_of_consignor}</p>
                          </div>
                          <div className="p-2 bg-white rounded-lg border border-gray-100">
                            <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                              <User className="w-3 h-3" /> To (Consignee)
                            </p>
                            <p className="font-medium text-gray-900 text-sm truncate">{ewbDetails.legal_name_of_consignee || 'N/A'}</p>
                            <p className="text-xs text-gray-500">{ewbDetails.place_of_consignee}, {ewbDetails.actual_to_state_name}</p>
                          </div>
                        </div>

                        {/* Transporter */}
                        <div className="p-2 bg-white rounded-lg border border-gray-100">
                          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                            <Truck className="w-3 h-3" /> Transporter
                          </p>
                          <p className="font-medium text-gray-900 text-sm">{ewbDetails.transporter_name || 'N/A'}</p>
                          <p className="text-xs text-gray-500">ID: {ewbDetails.transporter_id || 'N/A'}</p>
                        </div>

                        {/* Action */}
                        <div className="flex justify-end pt-1">
                          <Link
                            href={`/ewb/${result.challan_no}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
                          >
                            View Challan Details
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    )}

                    {/* Error Message if invalid */}
                    {isExpanded && !result.is_valid && result.error_message && (
                      <div className="px-3 pb-3 border-t border-red-100 bg-red-50">
                        <div className="flex items-start gap-2 pt-2">
                          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                          <p className="text-red-700 text-xs">{result.error_message}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Initial State - No Search Yet */}
      {!hasSearched && !loading && (
        <div className="p-6 text-center">
          <p className="text-gray-500 text-sm">
            Enter an E-Way Bill number to find its GR, challan, and validation details.
          </p>
        </div>
      )}
    </div>
  );
}
