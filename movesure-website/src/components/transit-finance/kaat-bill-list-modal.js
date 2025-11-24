'use client';

import React, { useState, useEffect } from 'react';
import { X, FileText, Edit, Trash2, Calendar, Package, DollarSign, User, Loader2, Printer } from 'lucide-react';
import { format } from 'date-fns';
import supabase from '../../app/utils/supabase';
import KaatBillPrintForm from './kaat-bill-print-form';
import KaatBillPDFPreview from './kaat-bill-pdf-preview';

export default function KaatBillListModal({ isOpen, onClose, selectedChallan, onEditKaatBill }) {
  const [kaatBills, setKaatBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPrintForm, setShowPrintForm] = useState(false);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [billForPrint, setBillForPrint] = useState(null);
  const [printFormData, setPrintFormData] = useState(null);

  useEffect(() => {
    if (isOpen && selectedChallan?.challan_no) {
      fetchKaatBills();
    }
  }, [isOpen, selectedChallan?.challan_no]);

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

  const handleEdit = (bill) => {
    onEditKaatBill(bill);
    onClose();
  };

  const handlePrint = (bill) => {
    setBillForPrint(bill);
    setShowPrintForm(true);
  };

  const handleProceedToPrint = (formData) => {
    setPrintFormData(formData);
    setShowPrintForm(false);
    setShowPDFPreview(true);
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

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[85vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
                <FileText className="w-6 h-6" />
                Saved Kaat Bills
              </h2>
              <p className="text-white/80 text-sm">
                Manage kaat bills for challan: <span className="font-semibold">{selectedChallan?.challan_no || 'N/A'}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Loading kaat bills...</p>
              </div>
            ) : kaatBills.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">No kaat bills found for this challan</p>
                <p className="text-sm text-gray-500 mt-2">Create one using the bilty table</p>
              </div>
            ) : (
              <div className="space-y-4">
                {kaatBills.map((bill) => (
                  <div
                    key={bill.id}
                    className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow bg-white"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3">
                          <h4 className="font-bold text-gray-900 text-xl truncate">
                            {bill.transport_name || 'Unknown Transport'}
                          </h4>
                          {bill.printed_yet && (
                            <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-1 rounded-full">
                              Printed
                            </span>
                          )}
                        </div>
                        
                        {bill.transport_gst && (
                          <div className="text-sm text-gray-600 mb-4">
                            <span className="font-medium">GST:</span> {bill.transport_gst}
                          </div>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="flex items-center gap-2 text-sm">
                            <Package className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            <div>
                              <div className="text-xs text-gray-500">Bilties</div>
                              <div className="font-semibold text-gray-900">{bill.total_bilty_count}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <DollarSign className="w-4 h-4 text-green-600 flex-shrink-0" />
                            <div>
                              <div className="text-xs text-gray-500">Kaat Amount</div>
                              <div className="font-semibold text-gray-900">₹{parseFloat(bill.total_kaat_amount).toFixed(2)}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-purple-600 flex-shrink-0" />
                            <div>
                              <div className="text-xs text-gray-500">Created</div>
                              <div className="font-semibold text-gray-900">
                                {format(new Date(bill.created_at), 'dd/MM/yyyy')}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <User className="w-4 h-4 text-orange-600 flex-shrink-0" />
                            <div>
                              <div className="text-xs text-gray-500">Created By</div>
                              <div className="font-semibold text-gray-900 truncate" title={bill.created_user?.name || bill.created_user?.username || 'Unknown'}>
                                {bill.created_user?.name || bill.created_user?.username || 'Unknown'}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="text-xs text-gray-500 bg-gray-50 rounded p-2">
                          <span className="font-medium">GR Numbers:</span> {Array.isArray(bill.gr_numbers) ? bill.gr_numbers.join(', ') : 'None'}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <button
                          onClick={() => handlePrint(bill)}
                          className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm font-semibold"
                          title="Print/Download PDF"
                        >
                          <Printer className="w-4 h-4" />
                          Print
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
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-4 bg-gray-50 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{kaatBills.length}</span> kaat bill{kaatBills.length !== 1 ? 's' : ''} found
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {showPrintForm && billForPrint && (
        <KaatBillPrintForm
          bill={billForPrint}
          onClose={() => {
            setShowPrintForm(false);
            setBillForPrint(null);
          }}
          onProceedToPrint={handleProceedToPrint}
        />
      )}

      {showPDFPreview && billForPrint && printFormData && (
        <KaatBillPDFPreview
          bill={billForPrint}
          printFormData={printFormData}
          onClose={() => {
            setShowPDFPreview(false);
            setBillForPrint(null);
            setPrintFormData(null);
          }}
          onDownloadComplete={() => {
            fetchKaatBills();
          }}
        />
      )}
    </>
  );
}
