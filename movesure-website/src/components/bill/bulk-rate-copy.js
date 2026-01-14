'use client';

import React, { useState, useEffect } from 'react';
import { Copy, Search, ChevronDown, CheckCircle, RefreshCw, Download } from 'lucide-react';
import supabase from '@/app/utils/supabase';

const BulkRateCopy = ({ currentBillId, partyName, onCopyRates }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [previousBills, setPreviousBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBill, setSelectedBill] = useState(null);
  const [copiedBillId, setCopiedBillId] = useState(null);

  // Fetch previous bills with bulk rates
  useEffect(() => {
    if (isOpen) {
      fetchPreviousBills();
    }
  }, [isOpen, partyName]);

  const fetchPreviousBills = async () => {
    try {
      setLoading(true);
      
      // Fetch bills for the same party or all bills if party not specified
      let query = supabase
        .from('bill_master')
        .select(`
          bill_id,
          bill_number,
          bill_date,
          party_name,
          billing_type,
          metadata,
          status
        `)
        .neq('bill_id', currentBillId)
        .order('bill_date', { ascending: false })
        .limit(50);

      if (partyName) {
        query = query.eq('party_name', partyName);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filter bills that have bulk rate metadata
      const billsWithRates = data.filter(bill => 
        bill.metadata && bill.metadata.bulkRates
      );

      setPreviousBills(billsWithRates);
    } catch (error) {
      console.error('Error fetching previous bills:', error);
      alert('Failed to load previous bills');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyRates = async (bill) => {
    try {
      setSelectedBill(bill.bill_id);
      
      if (!bill.metadata || !bill.metadata.bulkRates) {
        alert('No bulk rates found in this bill');
        return;
      }

      // Call the parent callback with the bulk rates metadata
      await onCopyRates(bill.metadata.bulkRates, bill.bill_number);
      
      setCopiedBillId(bill.bill_id);
      setTimeout(() => {
        setCopiedBillId(null);
        setIsOpen(false);
      }, 1500);
      
    } catch (error) {
      console.error('Error copying rates:', error);
      alert('Failed to copy rates');
    } finally {
      setSelectedBill(null);
    }
  };

  const filteredBills = previousBills.filter(bill =>
    bill.bill_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.party_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg shadow-sm p-4 border border-purple-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-600 rounded-lg">
            <Copy className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Copy Bulk Rates</h3>
            <p className="text-xs text-gray-600">Apply rates from previous bills</p>
          </div>
        </div>
        
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-md"
        >
          <Download className="h-4 w-4" />
          <span>{isOpen ? 'Close' : 'Select Bill'}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && (
        <div className="mt-4 space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by bill number or party name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchPreviousBills}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {/* Bills List */}
          <div className="max-h-[400px] overflow-y-auto space-y-2 bg-white rounded-lg p-3 border border-gray-200">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-purple-600" />
                <span className="ml-2 text-gray-600">Loading bills...</span>
              </div>
            ) : filteredBills.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Copy className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No previous bills with bulk rates found</p>
                {partyName && (
                  <p className="text-xs text-gray-400 mt-1">for party: {partyName}</p>
                )}
              </div>
            ) : (
              filteredBills.map((bill) => (
                <div
                  key={bill.bill_id}
                  className={`p-3 border rounded-lg transition-all cursor-pointer hover:shadow-md ${
                    copiedBillId === bill.bill_id
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 bg-white hover:border-purple-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">
                          Bill #{bill.bill_number}
                        </h4>
                        {copiedBillId === bill.bill_id && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{bill.party_name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-500">
                          📅 {formatDate(bill.bill_date)}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                          {bill.billing_type || 'Standard'}
                        </span>
                        {bill.metadata?.bulkRates?.rateType && (
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                            {bill.metadata.bulkRates.rateType === 'per-package' ? 'Per Package' : 'Per KG'}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleCopyRates(bill)}
                      disabled={selectedBill === bill.bill_id || copiedBillId === bill.bill_id}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                        copiedBillId === bill.bill_id
                          ? 'bg-green-600 text-white'
                          : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
                      } disabled:opacity-50`}
                    >
                      {selectedBill === bill.bill_id ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span className="text-sm">Copying...</span>
                        </>
                      ) : copiedBillId === bill.bill_id ? (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-sm">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          <span className="text-sm">Copy Rates</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Rate Details Preview */}
                  {bill.metadata?.bulkRates && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {bill.metadata.bulkRates.cityRates && (
                          <div className="text-gray-600">
                            <span className="font-medium">Cities:</span>{' '}
                            {Object.keys(bill.metadata.bulkRates.cityRates).length}
                          </div>
                        )}
                        {bill.metadata.bulkRates.labourRatePerPackage > 0 && (
                          <div className="text-gray-600">
                            <span className="font-medium">Labour/Pkg:</span>{' '}
                            ₹{bill.metadata.bulkRates.labourRatePerPackage}
                          </div>
                        )}
                        {bill.metadata.bulkRates.labourRatePerKg > 0 && (
                          <div className="text-gray-600">
                            <span className="font-medium">Labour/KG:</span>{' '}
                            ₹{bill.metadata.bulkRates.labourRatePerKg}
                          </div>
                        )}
                        {bill.metadata.bulkRates.billChargePerBilty > 0 && (
                          <div className="text-gray-600">
                            <span className="font-medium">Bill Charge:</span>{' '}
                            ₹{bill.metadata.bulkRates.billChargePerBilty}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {!loading && filteredBills.length > 0 && (
            <div className="text-xs text-gray-500 text-center">
              Showing {filteredBills.length} bill{filteredBills.length !== 1 ? 's' : ''} with saved rates
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BulkRateCopy;
