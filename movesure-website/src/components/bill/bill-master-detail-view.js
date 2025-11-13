'use client';

import React, { useState, useEffect } from 'react';
import { X, Edit, Trash2, Plus, ChevronDown, ChevronRight, FileText, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import supabase from '@/app/utils/supabase';
import { getBillDetails, deleteBiltyFromBillDetails } from '@/utils/billMasterHandler';

const BillMasterDetailView = ({ bill, onClose, onUpdate, onDelete }) => {
  const [billDetails, setBillDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [editingBill, setEditingBill] = useState(false);
  const [billForm, setBillForm] = useState({
    bill_number: bill.bill_number,
    bill_date: bill.bill_date,
    party_name: bill.party_name,
    billing_type: bill.billing_type,
    status: bill.status
  });

  useEffect(() => {
    loadBillDetails();
  }, [bill.bill_id]);

  const loadBillDetails = async () => {
    try {
      setLoading(true);
      const details = await getBillDetails(bill.bill_id);
      setBillDetails(details);
    } catch (error) {
      console.error('Error loading bill details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBilty = async (detailId, grno) => {
    if (!confirm(`Remove bilty ${grno} from this bill?`)) return;

    try {
      setDeleting(detailId);
      const result = await deleteBiltyFromBillDetails(detailId);
      
      if (result.success) {
        alert('✅ Bilty removed successfully');
        await loadBillDetails();
      } else {
        alert('❌ ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting bilty:', error);
      alert('Failed to delete bilty');
    } finally {
      setDeleting(null);
    }
  };

  const handleUpdateBill = async () => {
    try {
      const billDate = new Date(billForm.bill_date);
      const { data, error } = await supabase
        .from('bill_master')
        .update({
          ...billForm,
          bill_month: billDate.getMonth() + 1,
          bill_year: billDate.getFullYear()
        })
        .eq('bill_id', bill.bill_id)
        .select()
        .single();

      if (error) throw error;

      alert('✅ Bill updated successfully');
      setEditingBill(false);
      if (onUpdate) onUpdate(data);
    } catch (error) {
      console.error('Error updating bill:', error);
      alert('Failed to update bill: ' + error.message);
    }
  };

  const calculateTotals = () => {
    const totals = billDetails.reduce((acc, detail) => {
      const amount = parseFloat(detail.bilty_total || 0);
      acc.total += amount;
      
      if (detail.pay_mode?.toLowerCase() === 'paid') {
        acc.paid += amount;
      } else if (detail.pay_mode?.toLowerCase() === 'to-pay') {
        acc.toPay += amount;
      }
      
      return acc;
    }, { total: 0, paid: 0, toPay: 0 });

    return totals;
  };

  const totals = calculateTotals();

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6" />
            <div>
              <h2 className="text-xl font-bold">{bill.bill_number}</h2>
              <p className="text-sm text-blue-100">{bill.party_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditingBill(!editingBill)}
              className="p-2 hover:bg-blue-500 rounded-lg transition-colors"
              title="Edit bill"
            >
              <Edit className="h-5 w-5" />
            </button>
            <button
              onClick={() => onDelete && onDelete(bill.bill_id)}
              className="p-2 hover:bg-red-500 rounded-lg transition-colors"
              title="Delete bill"
            >
              <Trash2 className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-blue-500 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Bill Info / Edit Form */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          {editingBill ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Bill Number</label>
                <input
                  type="text"
                  value={billForm.bill_number}
                  onChange={(e) => setBillForm({ ...billForm, bill_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Bill Date</label>
                <input
                  type="date"
                  value={billForm.bill_date}
                  onChange={(e) => setBillForm({ ...billForm, bill_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Party Name</label>
                <input
                  type="text"
                  value={billForm.party_name}
                  onChange={(e) => setBillForm({ ...billForm, party_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Billing Type</label>
                <select
                  value={billForm.billing_type}
                  onChange={(e) => setBillForm({ ...billForm, billing_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="consignor">Consignor</option>
                  <option value="consignee">Consignee</option>
                  <option value="transport">Transport</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={billForm.status}
                  onChange={(e) => setBillForm({ ...billForm, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="Draft">Draft</option>
                  <option value="Finalized">Finalized</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              <div className="md:col-span-2 lg:col-span-5 flex gap-2">
                <button
                  onClick={handleUpdateBill}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setEditingBill(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500">Bill Date</p>
                <p className="text-sm font-medium text-gray-900">
                  {bill.bill_date ? format(new Date(bill.bill_date), 'dd MMM yyyy') : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Billing Type</p>
                <p className="text-sm font-medium text-gray-900 capitalize">{bill.billing_type}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  bill.status === 'Draft' ? 'bg-yellow-100 text-yellow-800' :
                  bill.status === 'Finalized' ? 'bg-green-100 text-green-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {bill.status}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Bilties</p>
                <p className="text-sm font-semibold text-blue-600">{billDetails.length}</p>
              </div>
            </div>
          )}
        </div>

        {/* Totals Summary */}
        <div className="px-6 py-3 bg-blue-50 border-b border-gray-200">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-xs text-gray-600">Total Amount</p>
              <p className="text-lg font-bold text-gray-900">₹{totals.total.toLocaleString('en-IN')}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-600">Paid</p>
              <p className="text-lg font-bold text-green-600">₹{totals.paid.toLocaleString('en-IN')}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-600">To Pay</p>
              <p className="text-lg font-bold text-orange-600">₹{totals.toPay.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>

        {/* Bilties Table */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : billDetails.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Bilties Added</h3>
              <p className="text-gray-600">Add bilties to this bill from the bill panel</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">GR No</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Consignor</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Consignee</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">City</th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Pkgs</th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Weight</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {billDetails.map((detail, index) => (
                    <tr key={detail.detail_id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">{detail.grno}</span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-600">
                          {detail.date ? format(new Date(detail.date), 'dd MMM yy') : 'N/A'}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-sm text-gray-900 truncate max-w-[150px] inline-block" title={detail.consignor}>
                          {detail.consignor || 'N/A'}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-sm text-gray-900 truncate max-w-[150px] inline-block" title={detail.consignee}>
                          {detail.consignee || 'N/A'}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-sm text-gray-900">{detail.city || 'N/A'}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="text-sm font-medium text-blue-600">{detail.no_of_pckg || 0}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="text-sm font-medium text-green-600">{detail.wt || 0}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          detail.pay_mode === 'paid' ? 'bg-green-100 text-green-800' :
                          detail.pay_mode === 'to-pay' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {detail.pay_mode?.toUpperCase() || 'N/A'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="text-sm font-semibold text-gray-900">
                          ₹{parseFloat(detail.bilty_total || 0).toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => handleDeleteBilty(detail.detail_id, detail.grno)}
                          disabled={deleting === detail.detail_id}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Remove bilty"
                        >
                          {deleting === detail.detail_id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BillMasterDetailView;
