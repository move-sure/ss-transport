'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Eye, Edit, Trash2, Calendar, Package, DollarSign, User } from 'lucide-react';
import { format } from 'date-fns';
import supabase from '../../app/utils/supabase';
import KaatBillDetailModal from './kaat-bill-detail-modal';

export default function KaatBillList({ selectedChallan, onEditKaatBill, refreshTrigger }) {
  const [kaatBills, setKaatBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    if (selectedChallan?.challan_no) {
      fetchKaatBills();
    } else {
      setKaatBills([]);
    }
  }, [selectedChallan?.challan_no, refreshTrigger]);

  const fetchKaatBills = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('kaat_bill_master')
        .select(`
          *,
          created_user:users!fk_kaat_bill_created_by(username, name),
          updated_user:users!fk_kaat_bill_updated_by(username, name)
        `)
        .eq('challan_no', selectedChallan.challan_no)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setKaatBills(data || []);
    } catch (err) {
      console.error('Error fetching kaat bills:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (bill) => {
    setSelectedBill(bill);
    setShowDetailModal(true);
  };

  const handleEdit = (bill) => {
    onEditKaatBill(bill);
  };

  const handleDelete = async (bill) => {
    if (!window.confirm(`Are you sure you want to delete this kaat bill?\n\nTransport: ${bill.transport_name}\nBilties: ${bill.total_bilty_count}\nAmount: ₹${bill.total_kaat_amount}`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('kaat_bill_master')
        .delete()
        .eq('id', bill.id);

      if (error) throw error;
      
      alert('✅ Kaat bill deleted successfully!');
      fetchKaatBills();
    } catch (err) {
      console.error('Error deleting kaat bill:', err);
      alert('Failed to delete kaat bill: ' + err.message);
    }
  };

  if (!selectedChallan) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
        <p className="text-gray-600 mt-4">Loading kaat bills...</p>
      </div>
    );
  }

  if (kaatBills.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 text-center">
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">No kaat bills found for this challan</p>
        <p className="text-sm text-gray-500 mt-1">Create one using the bilty table above</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Saved Kaat Bills ({kaatBills.length})
          </h3>
          <p className="text-sm text-white/80 mt-1">
            Manage kaat bills for challan {selectedChallan.challan_no}
          </p>
        </div>

        <div className="divide-y divide-gray-200">
          {kaatBills.map((bill) => (
            <div
              key={bill.id}
              className="p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-bold text-gray-900 text-lg truncate">
                      {bill.transport_name || 'Unknown Transport'}
                    </h4>
                    {bill.printed_yet && (
                      <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-full">
                        Printed
                      </span>
                    )}
                  </div>
                  
                  {bill.transport_gst && (
                    <div className="text-sm text-gray-600 mb-3">
                      GST: {bill.transport_gst}
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Package className="w-4 h-4 text-blue-600" />
                      <div>
                        <div className="text-xs text-gray-500">Bilties</div>
                        <div className="font-semibold text-gray-900">{bill.total_bilty_count}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      <div>
                        <div className="text-xs text-gray-500">Kaat Amount</div>
                        <div className="font-semibold text-gray-900">₹{parseFloat(bill.total_kaat_amount).toFixed(2)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-purple-600" />
                      <div>
                        <div className="text-xs text-gray-500">Created</div>
                        <div className="font-semibold text-gray-900">
                          {format(new Date(bill.created_at), 'dd/MM/yyyy')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-orange-600" />
                      <div>
                        <div className="text-xs text-gray-500">Created By</div>
                        <div className="font-semibold text-gray-900 truncate" title={bill.created_user?.name || bill.created_user?.username || 'Unknown'}>
                          {bill.created_user?.name || bill.created_user?.username || 'Unknown'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500">
                    GR Numbers: {Array.isArray(bill.gr_numbers) ? bill.gr_numbers.join(', ') : 'None'}
                  </div>
                </div>

                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleViewDetails(bill)}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-semibold"
                    title="View full details"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                  <button
                    onClick={() => handleEdit(bill)}
                    className="px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2 text-sm font-semibold"
                    title="Edit this kaat bill"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(bill)}
                    className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 text-sm font-semibold"
                    title="Delete this kaat bill"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showDetailModal && selectedBill && (
        <KaatBillDetailModal
          bill={selectedBill}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedBill(null);
          }}
        />
      )}
    </>
  );
}
