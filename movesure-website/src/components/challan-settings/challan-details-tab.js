'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../app/utils/auth';
import supabase from '../../app/utils/supabase';
import { format } from 'date-fns';
import { FileText, Edit2, Trash2, Truck, Calendar, User } from 'lucide-react';

const ChallanDetailsTab = ({ 
  challans, 
  challanBooks, 
  onLoadChallans, 
  onCreateNew, 
  onEdit, 
  userBranch 
}) => {
  const { user } = useAuth();
  const [filters, setFilters] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    status: 'all',
    challanBook: ''
  });

  // Load challans when filters change
  useEffect(() => {
    onLoadChallans(filters);
  }, [filters]);
  const handleDeleteChallan = async (challanId, challanNo) => {
    if (!confirm(`Are you sure you want to delete challan ${challanNo}?`)) return;

    try {
      // Step 1: Delete all transit records associated with this challan
      console.log(`🗑️ Deleting transit records for challan: ${challanNo}`);
      const { error: transitError } = await supabase
        .from('transit_details')
        .delete()
        .eq('challan_no', challanNo)
        .eq('is_active', true);

      if (transitError) {
        console.error('Error deleting transit records:', transitError);
        alert('Error deleting transit records: ' + transitError.message);
        return;
      }

      console.log(`✅ Successfully deleted transit records for challan: ${challanNo}`);

      // Step 2: Mark the challan as inactive
      const { error: challanError } = await supabase
        .from('challan_details')
        .update({ is_active: false })
        .eq('id', challanId);

      if (challanError) throw challanError;

      // Step 3: Find the challan book and decrease current number if needed
      const challanPrefix = challanNo.match(/^[A-Za-z]*/)?.[0] || '';
      const challanNumber = parseInt(challanNo.replace(/[A-Za-z]/g, '').replace(/[^0-9]/g, ''));
      
      if (challanNumber) {
        const { data: book } = await supabase
          .from('challan_books')
          .select('*')
          .eq('branch_1', user.branch_id)
          .eq('prefix', challanPrefix || null)
          .eq('current_number', challanNumber + 1)
          .single();

        if (book) {
          await supabase
            .from('challan_books')
            .update({ current_number: challanNumber })
            .eq('id', book.id);
        }
      }

      alert('Challan and all associated transit records deleted successfully');
      onLoadChallans(filters);
    } catch (error) {
      console.error('Error deleting challan:', error);
      alert('Error deleting challan');
    }
  };

  const handleDispatch = async (challanId, isCurrentlyDispatched) => {
    try {
      const { error } = await supabase
        .from('challan_details')
        .update({ 
          is_dispatched: !isCurrentlyDispatched,
          dispatch_date: !isCurrentlyDispatched ? new Date().toISOString() : null
        })
        .eq('id', challanId);

      if (error) throw error;

      alert(isCurrentlyDispatched ? 'Challan marked as pending' : 'Challan dispatched successfully');
      onLoadChallans(filters);
    } catch (error) {
      console.error('Error updating dispatch status:', error);
      alert('Error updating dispatch status');
    }
  };

  const getStatusBadge = (challan) => {
    if (challan.is_dispatched) {
      return (
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
          Dispatched
        </span>
      );
    }
    return (
      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
        Pending
      </span>
    );
  };

  const resetFilters = () => {
    setFilters({ 
      date: format(new Date(), 'yyyy-MM-dd'), 
      status: 'all', 
      challanBook: '' 
    });
  };

  return (
    <>
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-lg border border-blue-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Filter by Date
            </label>
            <input
              type="date"
              value={filters.date}
              onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="dispatched">Dispatched</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Challan Book
            </label>
            <select
              value={filters.challanBook}
              onChange={(e) => setFilters(prev => ({ ...prev, challanBook: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
            >
              <option value="">All Books</option>
              {challanBooks.map(book => (
                <option key={book.id} value={book.id}>
                  {book.from_branch?.branch_name} → {book.to_branch?.branch_name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onCreateNew}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Challan
            </button>
            <button
              onClick={resetFilters}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Challans List */}
      <div className="bg-white rounded-lg shadow-xl border border-blue-200 overflow-hidden">
        <div className="bg-blue-600 text-white p-4">
          <h2 className="text-lg font-bold">Challans ({challans.length})</h2>
        </div>
        
        {challans.length === 0 ? (
          <div className="p-8 text-center">
            <Truck className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-black mb-2">No Challans Found</h3>
            <p className="text-gray-600 mb-4">Create your first challan to get started</p>
            <button
              onClick={onCreateNew}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Challan
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase">Challan Details</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase">Truck & Personnel</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase">Bilty Count</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase">Created</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {challans.map((challan) => (
                  <tr key={challan.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-black">
                        Challan: {challan.challan_no}
                      </div>
                      <div className="text-xs text-gray-600">
                        Date: {format(new Date(challan.date), 'dd/MM/yyyy')}
                      </div>
                      {challan.remarks && (
                        <div className="text-xs text-gray-500 mt-1">
                          Remarks: {challan.remarks}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        {challan.truck && (
                          <div className="text-xs text-black">
                            <Truck className="w-3 h-3 inline mr-1" />
                            {challan.truck.truck_number} ({challan.truck.truck_type})
                          </div>
                        )}
                        {challan.driver && (
                          <div className="text-xs text-black">
                            <User className="w-3 h-3 inline mr-1" />
                            Driver: {challan.driver.name}
                          </div>
                        )}
                        {challan.owner && (
                          <div className="text-xs text-gray-600">
                            Owner: {challan.owner.name}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-lg font-bold text-blue-600">
                        {challan.total_bilty_count}
                      </div>
                      <div className="text-xs text-gray-500">bilties</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1">
                        {getStatusBadge(challan)}
                        {challan.is_dispatched && challan.dispatch_date && (
                          <div className="text-xs text-gray-500">
                            {format(new Date(challan.dispatch_date), 'dd/MM/yyyy HH:mm')}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-black">
                        {format(new Date(challan.created_at), 'dd/MM/yyyy')}
                      </div>
                      <div className="text-xs text-gray-500">
                        By: {challan.creator?.name || challan.creator?.username}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onEdit(challan)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDispatch(challan.id, challan.is_dispatched)}
                          className={`p-1 ${challan.is_dispatched ? 'text-yellow-600 hover:text-yellow-800' : 'text-green-600 hover:text-green-800'}`}
                          title={challan.is_dispatched ? 'Mark as Pending' : 'Mark as Dispatched'}
                        >
                          <Truck className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteChallan(challan.id, challan.challan_no)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
        <div className="bg-white p-6 rounded-lg shadow-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Challans</p>
              <p className="text-2xl font-bold text-black">{challans.length}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">
                {challans.filter(c => !c.is_dispatched).length}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Dispatched</p>
              <p className="text-2xl font-bold text-green-600">
                {challans.filter(c => c.is_dispatched).length}
              </p>
            </div>
            <Truck className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Bilties</p>
              <p className="text-2xl font-bold text-blue-600">
                {challans.reduce((sum, c) => sum + c.total_bilty_count, 0)}
              </p>
            </div>
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
        </div>
      </div>
    </>
  );
};

export default ChallanDetailsTab;