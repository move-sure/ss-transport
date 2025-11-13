'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Edit, Trash2, Eye, Plus, Search, RefreshCw, Info } from 'lucide-react';
import { format } from 'date-fns';
import supabase from '@/app/utils/supabase';
import BillMasterFullDetails from './bill-master-full-details';

const BillMasterList = ({ onSelectBill, onCreateNew }) => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedBillForView, setSelectedBillForView] = useState(null);

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    try {
      setLoading(true);
      
      // Fetch bills with detail count
      const { data: billsData, error: billsError } = await supabase
        .from('bill_master')
        .select('*')
        .order('created_date', { ascending: false })
        .limit(100);

      if (billsError) throw billsError;

      // Fetch counts for each bill
      const billsWithCounts = await Promise.all(
        (billsData || []).map(async (bill) => {
          const { count, error: countError } = await supabase
            .from('bill_details')
            .select('*', { count: 'exact', head: true })
            .eq('bill_id', bill.bill_id);

          return {
            ...bill,
            bilty_count: countError ? 0 : count
          };
        })
      );

      setBills(billsWithCounts);
    } catch (error) {
      console.error('Error fetching bills:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (billId, billNumber) => {
    if (!billNumber) {
      // Called from detail view
      const bill = bills.find(b => b.bill_id === billId);
      billNumber = bill?.bill_number || 'this bill';
    }

    if (!confirm(`Are you sure you want to delete bill ${billNumber}? This will also delete all associated bilty details.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('bill_master')
        .delete()
        .eq('bill_id', billId);

      if (error) throw error;
      
      alert('✅ Bill deleted successfully');
      setSelectedBillForView(null);
      fetchBills();
    } catch (error) {
      console.error('Error deleting bill:', error);
      alert('Failed to delete bill: ' + error.message);
    }
  };

  const handleViewBill = (bill) => {
    setSelectedBillForView(bill);
  };

  const handleUpdateBill = (updatedBill) => {
    // Update bill in local state
    setBills(prevBills => 
      prevBills.map(b => b.bill_id === updatedBill.bill_id ? { ...b, ...updatedBill } : b)
    );
    setSelectedBillForView(updatedBill);
  };

  const filteredBills = bills.filter(bill => {
    const matchesSearch = 
      bill.bill_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.party_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || bill.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Bill Master</h2>
            <p className="text-sm text-gray-600">Manage all your bills and bilties</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchBills}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-md disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={onCreateNew}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md"
            >
              <Plus className="h-5 w-5" />
              <span>Create New Bill</span>
            </button>
          </div>
        </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by bill number or party name..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Status</option>
          <option value="Draft">Draft</option>
          <option value="Finalized">Finalized</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {/* Bills List */}
      {filteredBills.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Bills Found</h3>
          <p className="text-gray-600 mb-4">Create your first bill to get started</p>
          <button
            onClick={onCreateNew}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>Create New Bill</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredBills.map((bill) => {
            const biltyCount = bill.bilty_count || 0;
            const statusColor = 
              bill.status === 'Draft' ? 'bg-yellow-100 text-yellow-800' :
              bill.status === 'Finalized' ? 'bg-green-100 text-green-800' :
              'bg-red-100 text-red-800';

            return (
              <div
                key={bill.bill_id}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-xl transition-all hover:border-blue-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-lg">
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">{bill.bill_number}</h3>
                      <p className="text-xs text-gray-500">
                        {bill.bill_date ? format(new Date(bill.bill_date), 'dd MMM yyyy') : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${statusColor}`}>
                    {bill.status}
                  </span>
                </div>

                <div className="space-y-2.5 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Party Name</p>
                    <p className="text-sm font-semibold text-gray-900 truncate" title={bill.party_name}>
                      {bill.party_name}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Type</p>
                      <p className="text-sm text-gray-900 capitalize">{bill.billing_type}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Bilties</p>
                      <p className="text-sm font-bold text-blue-600">{biltyCount}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleViewBill(bill)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all text-sm font-medium shadow-md"
                    title="View all details"
                  >
                    <Info className="h-4 w-4" />
                    <span>Details</span>
                  </button>
                  <button
                    onClick={() => window.location.href = `/bill/${bill.bill_id}`}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                    title="Edit bill"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(bill.bill_id, bill.bill_number)}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                    title="Delete bill"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>

      {/* Bill Full Detail View Modal */}
      {selectedBillForView && (
        <BillMasterFullDetails
          bill={selectedBillForView}
          onClose={() => setSelectedBillForView(null)}
          onUpdate={handleUpdateBill}
          onDelete={handleDelete}
        />
      )}
    </>
  );
};

export default BillMasterList;
