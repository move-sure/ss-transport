'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileText, 
  Building2, 
  Calendar, 
  Package,
  Loader2,
  Printer
} from 'lucide-react';
import { format } from 'date-fns';
import supabase from '@/app/utils/supabase';

export default function BillDetailsModal({ bill, onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (bill?.id) {
      fetchBillItems();
    }
  }, [bill?.id]);

  const fetchBillItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('monthly_bill_items')
        .select('*')
        .eq('monthly_bill_id', bill.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error('Error fetching bill items:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'dd MMM yyyy');
    } catch {
      return 'N/A';
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return '₹0';
    return `₹${parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  if (!bill) return null;

  const company = bill.company;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Bill Details</h2>
              <p className="text-sm text-gray-500">{bill.bill_no}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Bill Info Cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {/* Company Card */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-semibold text-blue-700">Company</span>
              </div>
              <p className="text-sm font-bold text-gray-900">{company?.company_name || 'Unknown'}</p>
              <p className="text-xs text-gray-600">{company?.gst_num || 'No GST'}</p>
              <p className="text-xs text-gray-600">{company?.city || 'N/A'}</p>
            </div>

            {/* Bill Date */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-green-600" />
                <span className="text-xs font-semibold text-green-700">Bill Date</span>
              </div>
              <p className="text-sm font-bold text-gray-900">{formatDate(bill.bill_date)}</p>
              <p className="text-xs text-gray-600">Period: {formatDate(bill.billing_start_date)} - {formatDate(bill.billing_end_date)}</p>
            </div>

            {/* Items Count */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4 text-purple-600" />
                <span className="text-xs font-semibold text-purple-700">Bilties</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{items.length}</p>
              <p className="text-xs text-gray-600">Items in bill</p>
            </div>

            {/* Total Amount */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-orange-600" />
                <span className="text-xs font-semibold text-orange-700">Total Amount</span>
              </div>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(bill.total_amount)}</p>
              <p className="text-xs text-gray-600">Status: {bill.status}</p>
            </div>
          </div>

          {/* Charges Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Charges Summary</h3>
            <div className="grid grid-cols-6 gap-4">
              <div>
                <span className="text-xs text-gray-500">Freight</span>
                <p className="text-sm font-medium text-gray-900">{formatCurrency(bill.total_freight)}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Labour</span>
                <p className="text-sm font-medium text-gray-900">{formatCurrency(bill.total_labour)}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Bill Charge</span>
                <p className="text-sm font-medium text-gray-900">{formatCurrency(bill.total_bill_charge)}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Toll</span>
                <p className="text-sm font-medium text-gray-900">{formatCurrency(bill.total_toll)}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">DD</span>
                <p className="text-sm font-medium text-gray-900">{formatCurrency(bill.total_dd)}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Other</span>
                <p className="text-sm font-medium text-gray-900">{formatCurrency(bill.total_other)}</p>
              </div>
            </div>
          </div>

          {/* Bill Items Table */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-slate-700 text-white px-4 py-2">
              <h3 className="text-sm font-semibold">Bill Items ({items.length})</h3>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No items found</div>
            ) : (
              <div className="overflow-auto max-h-64">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">S.No</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">GR No</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Type</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Rate</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Freight</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Labour</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Bill Ch</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Toll</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">DD</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Other</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((item, index) => (
                      <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-3 py-1.5 text-xs text-gray-600">{index + 1}</td>
                        <td className="px-3 py-1.5 text-xs font-medium text-gray-900">{item.gr_no}</td>
                        <td className="px-3 py-1.5">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            item.bilty_type === 'REGULAR' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                          }`}>
                            {item.bilty_type}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-xs text-right text-gray-700">{formatCurrency(item.rate)}</td>
                        <td className="px-3 py-1.5 text-xs text-right text-gray-700">{formatCurrency(item.freight_amount)}</td>
                        <td className="px-3 py-1.5 text-xs text-right text-gray-700">{formatCurrency(item.labour_charge)}</td>
                        <td className="px-3 py-1.5 text-xs text-right text-gray-700">{formatCurrency(item.bill_charge)}</td>
                        <td className="px-3 py-1.5 text-xs text-right text-gray-700">{formatCurrency(item.toll_charge)}</td>
                        <td className="px-3 py-1.5 text-xs text-right text-gray-700">{formatCurrency(item.dd_charge)}</td>
                        <td className="px-3 py-1.5 text-xs text-right text-gray-700">{formatCurrency(item.other_charge)}</td>
                        <td className="px-3 py-1.5 text-xs text-right font-semibold text-gray-900">{formatCurrency(item.total_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100">
                    <tr>
                      <td colSpan={4} className="px-3 py-2 text-xs font-semibold text-gray-700">Total</td>
                      <td className="px-3 py-2 text-xs text-right font-semibold text-gray-900">
                        {formatCurrency(items.reduce((sum, i) => sum + parseFloat(i.freight_amount || 0), 0))}
                      </td>
                      <td className="px-3 py-2 text-xs text-right font-semibold text-gray-900">
                        {formatCurrency(items.reduce((sum, i) => sum + parseFloat(i.labour_charge || 0), 0))}
                      </td>
                      <td className="px-3 py-2 text-xs text-right font-semibold text-gray-900">
                        {formatCurrency(items.reduce((sum, i) => sum + parseFloat(i.bill_charge || 0), 0))}
                      </td>
                      <td className="px-3 py-2 text-xs text-right font-semibold text-gray-900">
                        {formatCurrency(items.reduce((sum, i) => sum + parseFloat(i.toll_charge || 0), 0))}
                      </td>
                      <td className="px-3 py-2 text-xs text-right font-semibold text-gray-900">
                        {formatCurrency(items.reduce((sum, i) => sum + parseFloat(i.dd_charge || 0), 0))}
                      </td>
                      <td className="px-3 py-2 text-xs text-right font-semibold text-gray-900">
                        {formatCurrency(items.reduce((sum, i) => sum + parseFloat(i.other_charge || 0), 0))}
                      </td>
                      <td className="px-3 py-2 text-xs text-right font-bold text-blue-600">
                        {formatCurrency(items.reduce((sum, i) => sum + parseFloat(i.total_amount || 0), 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Remark */}
          {bill.remark && (
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <span className="text-xs font-semibold text-yellow-700">Remark:</span>
              <p className="text-sm text-gray-700 mt-1">{bill.remark}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
