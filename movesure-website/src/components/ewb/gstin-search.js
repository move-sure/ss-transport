'use client';

import React, { useState } from 'react';
import { searchGSTIN, formatGSTData, validateGSTIN } from './gst-search-api';
import { 
  Search, 
  Building, 
  MapPin, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Loader2,
  Copy
} from 'lucide-react';

export default function GSTINSearchComponent() {
  const [gstin, setGstin] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [error, setError] = useState('');
  const [validation, setValidation] = useState(null);

  const handleInputChange = (e) => {
    const value = e.target.value.toUpperCase();
    setGstin(value);
    setError('');
    
    if (value.length > 0) {
      const validationResult = validateGSTIN(value);
      setValidation(validationResult);
    } else {
      setValidation(null);
    }
  };
  const handleSearch = async () => {
    if (!gstin) {
      setError('Please enter a GSTIN');
      return;
    }

    const validationResult = validateGSTIN(gstin);
    if (!validationResult.valid) {
      setError(validationResult.message);
      return;
    }

    setLoading(true);
    setError('');
    setSearchResult(null);

    try {
      const result = await searchGSTIN(gstin);
      
      if (result.success) {
        const formattedData = formatGSTData(result.data);
        setSearchResult(formattedData);
      } else {
        setError(result.error || 'Failed to search GSTIN. Please try again.');
      }
    } catch (error) {
      console.error('Search error:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const [day, month, year] = dateString.split('/');
      return new Date(`${year}-${month}-${day}`).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'provisional':
        return 'text-yellow-600 bg-yellow-100';
      case 'cancelled':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }  };
  return (
    <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-8 hover:shadow-2xl transition-all duration-300">
      <div className="flex items-center mb-6">
        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-4">
          <Search className="h-6 w-6 text-white" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900">GSTIN Search & Verification</h3>
      </div>      {/* Search Input */}
      <div className="mb-8">
        <div className="flex space-x-4">
          <div className="flex-1">
            <label htmlFor="gstin" className="block text-sm font-bold text-gray-800 mb-3">
              Enter GSTIN Number
            </label><input
              type="text"
              id="gstin"
              value={gstin}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="e.g., 05ABNTY3290P8ZB"
              maxLength={15}
              className={`block w-full px-4 py-3 border rounded-lg shadow-lg text-black bg-white font-semibold focus:ring-3 focus:ring-blue-500 focus:border-blue-500 focus:shadow-xl transform focus:scale-105 transition-all duration-200 ${
                validation?.valid === false ? 'border-red-400 bg-red-50' : 'border-gray-300 hover:border-blue-300'
              }`}
            />
            {validation && (
              <div className={`mt-2 flex items-center text-sm ${
                validation.valid ? 'text-green-600' : 'text-red-600'
              }`}>
                {validation.valid ? (
                  <CheckCircle className="h-4 w-4 mr-1" />
                ) : (
                  <XCircle className="h-4 w-4 mr-1" />
                )}
                {validation.message}
              </div>            )}
          </div>
          <div className="flex items-end">            <button
              onClick={handleSearch}
              disabled={loading || !gstin}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 focus:ring-3 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Search className="h-5 w-5" />
              )}
              <span>{loading ? 'Searching...' : 'Search'}</span>
            </button>
          </div>
        </div>
      </div>      {/* Error Display */}
      {error && (
        <div className="mb-8 p-6 bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-500 rounded-xl shadow-lg">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center mr-4">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h4 className="font-bold text-red-800 mb-1">Error Occurred</h4>
              <span className="text-red-700 font-medium">{error}</span>
            </div>
          </div>
        </div>
      )}

      {/* Search Results */}
      {searchResult && (
        <div className="space-y-6">          {/* Basic Information */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-8 shadow-lg border border-blue-200">
            <h4 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                <Building className="h-5 w-5 text-white" />
              </div>
              Business Information
            </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <label className="block text-sm font-bold text-gray-700 mb-2">GSTIN Number</label>
                <div className="flex items-center space-x-3">
                  <span className="text-lg font-mono text-black font-bold bg-gray-100 px-3 py-2 rounded-lg">{searchResult.gstin}</span>
                  <button
                    onClick={() => copyToClipboard(searchResult.gstin)}
                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>              
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <label className="block text-sm font-bold text-gray-700 mb-2">Registration Status</label>
                <span className={`inline-flex px-4 py-2 rounded-full text-sm font-bold shadow-sm ${getStatusColor(searchResult.status)}`}>
                  {searchResult.status}
                </span>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <label className="block text-sm font-bold text-gray-700 mb-2">Legal Business Name</label>
                <p className="text-black font-semibold text-lg">{searchResult.legalName}</p>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <label className="block text-sm font-bold text-gray-700 mb-2">Trade Name</label>
                <p className="text-black font-medium">{searchResult.tradeName || 'N/A'}</p>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <label className="block text-sm font-bold text-gray-700 mb-2">Business Type</label>
                <p className="text-black font-medium">{searchResult.businessType}</p>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <label className="block text-sm font-bold text-gray-700 mb-2">E-Invoice Status</label>
                <span className={`inline-flex px-3 py-2 rounded-lg text-sm font-bold shadow-sm ${
                  searchResult.einvoiceStatus === 'Yes' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'
                }`}>
                  {searchResult.einvoiceStatus}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <label className="block text-sm font-bold text-gray-700 mb-2">Registration Date</label>
                <div className="flex items-center text-black font-medium">
                  <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                  {formatDate(searchResult.registrationDate)}
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <label className="block text-sm font-bold text-gray-700 mb-2">Last Updated</label>
                <div className="flex items-center text-black font-medium">
                  <Calendar className="h-5 w-5 mr-2 text-green-600" />
                  {formatDate(searchResult.lastUpdated)}
                </div>
              </div>
            </div>
          </div>          {/* Jurisdictions */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-8 shadow-lg border border-purple-200">
            <h4 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center mr-3">
                <Building className="h-5 w-5 text-white" />
              </div>
              Tax Jurisdictions
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <label className="block text-sm font-bold text-gray-700 mb-2">State Jurisdiction</label>
                <p className="text-black font-semibold text-lg">{searchResult.stateJurisdiction}</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <label className="block text-sm font-bold text-gray-700 mb-2">Center Jurisdiction</label>
                <p className="text-black font-semibold text-lg">{searchResult.centerJurisdiction}</p>
              </div>
            </div>
          </div>          {/* Principal Address */}
          {searchResult.principalAddress && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-8 shadow-lg border border-green-200">
              <h4 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center mr-3">
                  <MapPin className="h-5 w-5 text-white" />
                </div>
                Principal Business Address
              </h4>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="space-y-3">
                  {searchResult.principalAddress.addr.bnm && (
                    <p className="text-black font-semibold text-lg">{searchResult.principalAddress.addr.bnm}</p>
                  )}
                  {searchResult.principalAddress.addr.flno && (
                    <p className="text-gray-700 font-medium">Floor: {searchResult.principalAddress.addr.flno}</p>
                  )}
                  {searchResult.principalAddress.addr.bno && (
                    <p className="text-gray-700 font-medium">Building No: {searchResult.principalAddress.addr.bno}</p>
                  )}
                  <p className="text-gray-700 font-medium">
                    {searchResult.principalAddress.addr.st}, {searchResult.principalAddress.addr.loc}
                  </p>
                  <p className="text-gray-700 font-medium">
                    {searchResult.principalAddress.addr.stcd} - {searchResult.principalAddress.addr.pncd}
                  </p>
                  {searchResult.principalAddress.ntr && Array.isArray(searchResult.principalAddress.ntr) && searchResult.principalAddress.ntr.length > 0 && (
                    <div className="mt-4">
                      <label className="block text-sm font-bold text-gray-700 mb-3">Nature of Business</label>
                      <div className="flex flex-wrap gap-2">
                        {searchResult.principalAddress.ntr.map((nature, index) => (
                          <span key={index} className="px-3 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm font-semibold border border-blue-200 shadow-sm">
                            {nature}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}          {/* Nature of Business */}
          {searchResult.natureOfBusiness && Array.isArray(searchResult.natureOfBusiness) && searchResult.natureOfBusiness.length > 0 && (
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-8 shadow-lg border border-orange-200">
              <h4 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center mr-3">
                  <Building className="h-5 w-5 text-white" />
                </div>
                Business Activities & Services
              </h4>
              <div className="flex flex-wrap gap-3">
                {searchResult.natureOfBusiness.map((business, index) => (
                  <span key={index} className="px-4 py-3 bg-white text-orange-800 rounded-xl text-sm font-bold shadow-sm border border-orange-200 hover:shadow-md transition-all">
                    {business}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
