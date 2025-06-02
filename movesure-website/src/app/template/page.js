"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Search, Printer, X, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import supabase from '../utils/supabase';
import { useAuth } from '../utils/auth';
import PDFGenerator from '../../components/bilty/pdf-generation';

const GRLookupPrintSystem = ({ onClose }) => {
  const { user } = useAuth();
  const [grNumber, setGrNumber] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedBilty, setSelectedBilty] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPDFGenerator, setShowPDFGenerator] = useState(false);
  const [biltyData, setBiltyData] = useState(null);
  const [branchData, setBranchData] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    // Focus on input when component mounts
    if (inputRef.current) {
      inputRef.current.focus();
    }
    
    // Load branch data
    if (user?.branch_id) {
      loadBranchData();
    }
  }, [user]);

  useEffect(() => {
    // Handle keyboard shortcuts
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showPDFGenerator) {
          setShowPDFGenerator(false);
        } else {
          onClose();
        }
      }
      if (e.key === 'Enter' && grNumber.length >= 3) {
        handleSearch();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [grNumber, showPDFGenerator, onClose]);

  const loadBranchData = async () => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('id', user.branch_id)
        .single();
      
      if (error) throw error;
      setBranchData(data);
    } catch (error) {
      console.error('Error loading branch data:', error);
    }
  };

  const handleSearch = async () => {
    if (grNumber.length < 3) {
      setError('Please enter at least 3 characters');
      return;
    }

    setLoading(true);
    setError('');
    setSearchResults([]);

    try {
      const { data, error } = await supabase
        .from('bilty')
        .select(`
          id,
          gr_no,
          bilty_date,
          consignor_name,
          consignee_name,
          total,
          saving_option,
          branch_id,
          is_active
        `)
        .ilike('gr_no', `%${grNumber}%`)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      if (data.length === 0) {
        setError(`No bilty found with GR number containing "${grNumber}"`);
      } else {
        setSearchResults(data);
        // If exact match found, auto-select it
        const exactMatch = data.find(b => b.gr_no.toLowerCase() === grNumber.toLowerCase());
        if (exactMatch) {
          setSelectedBilty(exactMatch);
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      setError('Error searching for bilty. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBilty = async (bilty) => {
    setSelectedBilty(bilty);
    setLoading(true);

    try {
      // Load full bilty data
      const { data: fullBiltyData, error: biltyError } = await supabase
        .from('bilty')
        .select('*')
        .eq('id', bilty.id)
        .single();

      if (biltyError) throw biltyError;

      setBiltyData(fullBiltyData);
      
      // Auto-print if its an exact match
      const exactMatch = fullBiltyData.gr_no.toLowerCase() === grNumber.toLowerCase();
      if (exactMatch) {
        setShowPDFGenerator(true);
      }
    } catch (error) {
      console.error('Error loading bilty details:', error);
      setError('Error loading bilty details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintSelected = () => {
    if (selectedBilty && biltyData) {
      setShowPDFGenerator(true);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const closePDFGenerator = () => {
    setShowPDFGenerator(false);
    // Reset for next search
    setGrNumber('');
    setSearchResults([]);
    setSelectedBilty(null);
    setBiltyData(null);
    setError('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Show PDF Generator if requested
  if (showPDFGenerator && biltyData) {
    return (
      <PDFGenerator
        biltyData={biltyData}
        branchData={branchData}
        onClose={closePDFGenerator}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Search className="w-6 h-6" />
              <h2 className="text-xl font-bold">GR Number Lookup & Print</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <p className="text-blue-100 mt-2">
            Enter GR number to search and print existing bilty
          </p>
        </div>

        {/* Search Section */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                GR Number
              </label>
              <input
                ref={inputRef}
                type="text"
                value={grNumber}
                onChange={(e) => {
                  setGrNumber(e.target.value.toUpperCase());
                  setError('');
                  setSearchResults([]);
                  setSelectedBilty(null);
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
                placeholder="Enter GR number (e.g., ALG001, SS123, etc.)"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-lg font-mono"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleSearch}
                disabled={loading || grNumber.length < 3}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
                Search
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Search Results ({searchResults.length})
            </h3>
            
            <div className="grid gap-3 max-h-96 overflow-y-auto">
              {searchResults.map((bilty) => (
                <div
                  key={bilty.id}
                  onClick={() => handleSelectBilty(bilty)}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                    selectedBilty?.id === bilty.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-lg font-bold text-blue-600">
                          {bilty.gr_no}
                        </span>
                        <span className="text-sm text-gray-500">
                          {formatDate(bilty.bilty_date)}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          bilty.saving_option === 'DRAFT' 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {bilty.saving_option}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>
                          <strong>From:</strong> {bilty.consignor_name}
                        </div>
                        <div>
                          <strong>To:</strong> {bilty.consignee_name}
                        </div>
                        <div>
                          <strong>Amount:</strong> 
                          <span className="font-bold text-green-600 ml-1">
                            ₹{bilty.total}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {selectedBilty?.id === bilty.id && (
                      <div className="flex items-center text-blue-600">
                        <CheckCircle className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selected Bilty Actions */}
        {selectedBilty && (
          <div className="p-6 bg-gray-50 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-semibold text-gray-800">
                  Selected: {selectedBilty.gr_no}
                </h4>
                <p className="text-sm text-gray-600">
                  {selectedBilty.consignor_name} → {selectedBilty.consignee_name}
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSelectedBilty(null);
                    setBiltyData(null);
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Clear Selection
                </button>
                
                <button
                  onClick={handlePrintSelected}
                  disabled={!biltyData || loading}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Printer className="w-5 h-5" />
                  )}
                  Print Bilty
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="p-4 bg-blue-50 border-t border-blue-200">
          <div className="text-sm text-blue-700 flex items-center gap-2">
            <div className="flex items-center gap-4">
              <span>💡 <strong>Tips:</strong></span>
              <span>• Enter at least 3 characters to search</span>
              <span>• Press Enter to search quickly</span>
              <span>• Exact matches will auto-select</span>
              <span>• Press Esc to close</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GRLookupPrintSystem;