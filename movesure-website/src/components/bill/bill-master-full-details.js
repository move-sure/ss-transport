'use client';

import React, { useState, useEffect } from 'react';
import { X, Edit, Trash2, FileText, Calendar, User, TrendingUp, Package, Weight, CreditCard, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import supabase from '@/app/utils/supabase';
import { getBillDetails, deleteBiltyFromBillDetails } from '@/utils/billMasterHandler';

const BillMasterFullDetails = ({ bill, onClose, onUpdate, onDelete }) => {
  const [billDetails, setBillDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [editingBill, setEditingBill] = useState(false);
  const [expandedBilty, setExpandedBilty] = useState(null);
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
      const biltyTotal = parseFloat(detail.bilty_total || 0);
      const freightAmount = parseFloat(detail.freight_amount || 0);
      const labourCharge = parseFloat(detail.labour_charge || 0);
      const ddCharge = parseFloat(detail.dd_charge || 0);
      const tollCharge = parseFloat(detail.toll_charge || 0);
      const pfCharge = parseFloat(detail.pf_charge || 0);
      const otherCharge = parseFloat(detail.other_charge || 0);
      
      acc.total += biltyTotal;
      acc.freight += freightAmount;
      acc.labour += labourCharge;
      acc.dd += ddCharge;
      acc.toll += tollCharge;
      acc.pf += pfCharge;
      acc.other += otherCharge;
      acc.packages += parseInt(detail.no_of_pckg || 0);
      acc.weight += parseFloat(detail.wt || 0);
      
      if (detail.pay_mode?.toLowerCase() === 'paid') {
        acc.paid += biltyTotal;
      } else if (detail.pay_mode?.toLowerCase() === 'to-pay') {
        acc.toPay += biltyTotal;
      }
      
      return acc;
    }, { 
      total: 0, 
      paid: 0, 
      toPay: 0, 
      freight: 0, 
      labour: 0, 
      dd: 0, 
      toll: 0, 
      pf: 0, 
      other: 0,
      packages: 0,
      weight: 0
    });

    return totals;
  };

  const totals = calculateTotals();

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[95vw] max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-t-2xl">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <FileText className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{bill.bill_number}</h2>
              <p className="text-sm text-blue-100 flex items-center gap-2 mt-1">
                <User className="h-4 w-4" />
                {bill.party_name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditingBill(!editingBill)}
              className="p-2.5 hover:bg-white/20 rounded-lg transition-colors"
              title="Edit bill"
            >
              <Edit className="h-5 w-5" />
            </button>
            <button
              onClick={() => onDelete && onDelete(bill.bill_id)}
              className="p-2.5 hover:bg-red-500/80 rounded-lg transition-colors"
              title="Delete bill"
            >
              <Trash2 className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2.5 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Bill Info / Edit Form */}
        <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200">
          {editingBill ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Bill Number</label>
                <input
                  type="text"
                  value={billForm.bill_number}
                  onChange={(e) => setBillForm({ ...billForm, bill_number: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Bill Date</label>
                <input
                  type="date"
                  value={billForm.bill_date}
                  onChange={(e) => setBillForm({ ...billForm, bill_date: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Party Name</label>
                <input
                  type="text"
                  value={billForm.party_name}
                  onChange={(e) => setBillForm({ ...billForm, party_name: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Billing Type</label>
                <select
                  value={billForm.billing_type}
                  onChange={(e) => setBillForm({ ...billForm, billing_type: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                >
                  <option value="consignor">Consignor</option>
                  <option value="consignee">Consignee</option>
                  <option value="transport">Transport</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                <select
                  value={billForm.status}
                  onChange={(e) => setBillForm({ ...billForm, status: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                >
                  <option value="Draft">Draft</option>
                  <option value="Finalized">Finalized</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              <div className="md:col-span-2 lg:col-span-5 flex gap-2">
                <button
                  onClick={handleUpdateBill}
                  className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all text-sm font-semibold shadow-md"
                >
                  💾 Save Changes
                </button>
                <button
                  onClick={() => setEditingBill(false)}
                  className="px-6 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-xs text-gray-500 font-medium">Bill Date</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {bill.bill_date ? format(new Date(bill.bill_date), 'dd MMM yyyy') : 'N/A'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-indigo-600" />
                <div>
                  <p className="text-xs text-gray-500 font-medium">Billing Type</p>
                  <p className="text-sm font-semibold text-gray-900 capitalize">{bill.billing_type}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-xs text-gray-500 font-medium">Status</p>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                    bill.status === 'Draft' ? 'bg-yellow-100 text-yellow-800' :
                    bill.status === 'Finalized' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {bill.status}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-xs text-gray-500 font-medium">Total Bilties</p>
                  <p className="text-sm font-bold text-blue-600">{billDetails.length}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Totals Summary */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-b-2 border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-md border-l-4 border-blue-600">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-5 w-5 text-blue-600" />
                <p className="text-xs text-gray-600 font-semibold">Total Amount</p>
              </div>
              <p className="text-xl font-bold text-gray-900">₹{totals.total.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-md border-l-4 border-green-600">
              <div className="flex items-center gap-2 mb-1">
                <CreditCard className="h-5 w-5 text-green-600" />
                <p className="text-xs text-gray-600 font-semibold">Paid</p>
              </div>
              <p className="text-xl font-bold text-green-600">₹{totals.paid.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-md border-l-4 border-orange-600">
              <div className="flex items-center gap-2 mb-1">
                <CreditCard className="h-5 w-5 text-orange-600" />
                <p className="text-xs text-gray-600 font-semibold">To Pay</p>
              </div>
              <p className="text-xl font-bold text-orange-600">₹{totals.toPay.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-md border-l-4 border-purple-600">
              <div className="flex items-center gap-2 mb-1">
                <Package className="h-5 w-5 text-purple-600" />
                <p className="text-xs text-gray-600 font-semibold">Packages</p>
              </div>
              <p className="text-xl font-bold text-purple-600">{totals.packages}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-md border-l-4 border-indigo-600">
              <div className="flex items-center gap-2 mb-1">
                <Weight className="h-5 w-5 text-indigo-600" />
                <p className="text-xs text-gray-600 font-semibold">Weight</p>
              </div>
              <p className="text-xl font-bold text-indigo-600">{totals.weight.toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-md border-l-4 border-pink-600">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-5 w-5 text-pink-600" />
                <p className="text-xs text-gray-600 font-semibold">Freight</p>
              </div>
              <p className="text-lg font-bold text-pink-600">₹{totals.freight.toLocaleString('en-IN')}</p>
            </div>
          </div>
          
          {/* Charges Breakdown */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-white/70 rounded-lg p-2 text-center">
              <p className="text-xs text-gray-600">Labour</p>
              <p className="text-sm font-bold text-gray-900">₹{totals.labour.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white/70 rounded-lg p-2 text-center">
              <p className="text-xs text-gray-600">DD Charge</p>
              <p className="text-sm font-bold text-gray-900">₹{totals.dd.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white/70 rounded-lg p-2 text-center">
              <p className="text-xs text-gray-600">Toll</p>
              <p className="text-sm font-bold text-gray-900">₹{totals.toll.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white/70 rounded-lg p-2 text-center">
              <p className="text-xs text-gray-600">PF Charge</p>
              <p className="text-sm font-bold text-gray-900">₹{totals.pf.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white/70 rounded-lg p-2 text-center">
              <p className="text-xs text-gray-600">Other</p>
              <p className="text-sm font-bold text-gray-900">₹{totals.other.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>

        {/* Bilties Table with Full Details */}
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
            <div className="space-y-3">
              {billDetails.map((detail, index) => (
                <div 
                  key={detail.detail_id} 
                  className={`bg-white rounded-xl border-2 ${
                    expandedBilty === detail.detail_id ? 'border-blue-500 shadow-xl' : 'border-gray-200 shadow-md'
                  } overflow-hidden transition-all hover:shadow-lg`}
                >
                  {/* Bilty Header */}
                  <div 
                    className={`flex items-center justify-between p-4 cursor-pointer ${
                      expandedBilty === detail.detail_id ? 'bg-blue-50' : 'bg-gray-50 hover:bg-blue-50'
                    } transition-colors`}
                    onClick={() => setExpandedBilty(expandedBilty === detail.detail_id ? null : detail.detail_id)}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="bg-blue-600 text-white rounded-lg px-3 py-1.5 font-bold text-sm">
                        #{index + 1}
                      </div>
                      <div className="flex-1 grid grid-cols-2 md:grid-cols-6 gap-3">
                        <div>
                          <p className="text-xs text-gray-500">GR No</p>
                          <p className="text-sm font-bold text-gray-900">{detail.grno}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Date</p>
                          <p className="text-sm font-medium text-gray-900">
                            {detail.date ? format(new Date(detail.date), 'dd MMM yy') : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Consignor</p>
                          <p className="text-sm font-medium text-gray-900 truncate" title={detail.consignor}>
                            {detail.consignor || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">City</p>
                          <p className="text-sm font-medium text-gray-900">{detail.city || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Payment</p>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${
                            detail.pay_mode === 'paid' ? 'bg-green-100 text-green-800' :
                            detail.pay_mode === 'to-pay' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {detail.pay_mode?.toUpperCase() || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Amount</p>
                          <p className="text-base font-bold text-blue-600">
                            ₹{parseFloat(detail.bilty_total || 0).toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBilty(detail.detail_id, detail.grno);
                      }}
                      disabled={deleting === detail.detail_id}
                      className="p-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 ml-2"
                      title="Remove bilty"
                    >
                      {deleting === detail.detail_id ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                      ) : (
                        <Trash2 className="h-5 w-5" />
                      )}
                    </button>
                  </div>

                  {/* Expanded Details */}
                  {expandedBilty === detail.detail_id && (
                    <div className="p-4 bg-white border-t-2 border-gray-100">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 font-semibold mb-1">Consignee</p>
                          <p className="text-sm font-medium text-gray-900">{detail.consignee || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-semibold mb-1">Packages</p>
                          <p className="text-sm font-bold text-blue-600">{detail.no_of_pckg || 0}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-semibold mb-1">Weight</p>
                          <p className="text-sm font-bold text-green-600">{detail.wt || 0}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-semibold mb-1">Private Marks</p>
                          <p className="text-sm font-medium text-gray-900">{detail.pvt_marks || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-semibold mb-1">Delivery Type</p>
                          <p className="text-sm font-medium text-gray-900 capitalize">{detail.delivery_type || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-semibold mb-1">Rate/Kg</p>
                          <p className="text-sm font-bold text-gray-900">₹{parseFloat(detail.rate_by_kg || 0).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-semibold mb-1">Labour Rate</p>
                          <p className="text-sm font-bold text-gray-900">₹{parseFloat(detail.labour_rate || 0).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-semibold mb-1">Freight Amount</p>
                          <p className="text-sm font-bold text-purple-600">₹{parseFloat(detail.freight_amount || 0).toLocaleString('en-IN')}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-semibold mb-1">Labour Charge</p>
                          <p className="text-sm font-bold text-indigo-600">₹{parseFloat(detail.labour_charge || 0).toLocaleString('en-IN')}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-semibold mb-1">DD Charge</p>
                          <p className="text-sm font-bold text-pink-600">₹{parseFloat(detail.dd_charge || 0).toLocaleString('en-IN')}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-semibold mb-1">Toll Charge</p>
                          <p className="text-sm font-bold text-orange-600">₹{parseFloat(detail.toll_charge || 0).toLocaleString('en-IN')}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-semibold mb-1">PF Charge</p>
                          <p className="text-sm font-bold text-teal-600">₹{parseFloat(detail.pf_charge || 0).toLocaleString('en-IN')}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-semibold mb-1">Other Charge</p>
                          <p className="text-sm font-bold text-cyan-600">₹{parseFloat(detail.other_charge || 0).toLocaleString('en-IN')}</p>
                        </div>
                        <div className="md:col-span-3 lg:col-span-4 pt-3 border-t-2 border-gray-200">
                          <p className="text-xs text-gray-500 font-semibold mb-1">Bilty Total</p>
                          <p className="text-2xl font-bold text-blue-600">
                            ₹{parseFloat(detail.bilty_total || 0).toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BillMasterFullDetails;
