'use client';

import React, { useState, useEffect } from 'react';
import { X, FileText, Calendar, User, Package, DollarSign, Printer, Edit2, Save, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import supabase from '../../app/utils/supabase';

export default function KaatBillDetailModal({ bill, onClose, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedBill, setEditedBill] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (bill) {
      setEditedBill({
        ...bill,
        gr_numbers: Array.isArray(bill.gr_numbers) ? bill.gr_numbers : []
      });
    }
  }, [bill]);

  const handleSave = async () => {
    if (!editedBill) return;

    try {
      setSaving(true);

      // Get current user for updated_by
      const userSession = localStorage.getItem('userSession');
      let updatedBy = null;
      if (userSession) {
        const session = JSON.parse(userSession);
        updatedBy = session.user?.id || null;
      }

      const { error } = await supabase
        .from('kaat_bill_master')
        .update({
          transport_name: editedBill.transport_name,
          transport_gst: editedBill.transport_gst,
          gr_numbers: editedBill.gr_numbers,
          total_bilty_count: editedBill.gr_numbers.length,
          updated_by: updatedBy,
          updated_at: new Date().toISOString()
        })
        .eq('id', editedBill.id);

      if (error) throw error;

      alert('✅ Kaat bill updated successfully!');
      setIsEditing(false);
      if (onUpdate) onUpdate();
      onClose();
    } catch (err) {
      console.error('Error updating kaat bill:', err);
      alert('Failed to update kaat bill: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPrinted = async () => {
    try {
      const { error } = await supabase
        .from('kaat_bill_master')
        .update({ printed_yet: true })
        .eq('id', bill.id);

      if (error) throw error;

      alert('✅ Marked as printed!');
      if (onUpdate) onUpdate();
      onClose();
    } catch (err) {
      console.error('Error marking as printed:', err);
      alert('Failed to mark as printed: ' + err.message);
    }
  };

  const handleAddGrNumber = () => {
    const grNo = prompt('Enter GR Number to add:');
    if (grNo && grNo.trim()) {
      const normalized = grNo.trim().toUpperCase();
      if (!editedBill.gr_numbers.includes(normalized)) {
        setEditedBill({
          ...editedBill,
          gr_numbers: [...editedBill.gr_numbers, normalized]
        });
      } else {
        alert('This GR number already exists in the bill!');
      }
    }
  };

  const handleRemoveGrNumber = (grNo) => {
    setEditedBill({
      ...editedBill,
      gr_numbers: editedBill.gr_numbers.filter(gr => gr !== grNo)
    });
  };

  if (!editedBill) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
              <FileText className="w-6 h-6" />
              Kaat Bill Details
            </h2>
            <p className="text-white/80 text-sm">
              Bill ID: #{editedBill.id} | Challan: {editedBill.challan_no}
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
          {/* Transport Information */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-600" />
              Transport Information
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600 font-medium">Transport Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedBill.transport_name || ''}
                      onChange={(e) => setEditedBill({ ...editedBill, transport_name: e.target.value })}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  ) : (
                    <div className="text-gray-900 font-semibold mt-1">
                      {editedBill.transport_name || 'N/A'}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm text-gray-600 font-medium">Transport GST</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedBill.transport_gst || ''}
                      onChange={(e) => setEditedBill({ ...editedBill, transport_gst: e.target.value })}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  ) : (
                    <div className="text-gray-900 font-semibold mt-1">
                      {editedBill.transport_gst || 'N/A'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Financial Summary
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="text-sm text-blue-700 font-medium">Total Bilties</div>
                <div className="text-2xl font-bold text-blue-900 mt-1">
                  {editedBill.gr_numbers.length}
                </div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="text-sm text-green-700 font-medium">Total Kaat Amount</div>
                <div className="text-2xl font-bold text-green-900 mt-1">
                  ₹{parseFloat(editedBill.total_kaat_amount || 0).toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* GR Numbers */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                GR Numbers ({editedBill.gr_numbers.length})
              </h3>
              {isEditing && (
                <button
                  onClick={handleAddGrNumber}
                  className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold"
                >
                  + Add GR
                </button>
              )}
            </div>
            <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-auto">
              {editedBill.gr_numbers.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No GR numbers</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {editedBill.gr_numbers.map((grNo, index) => (
                    <div
                      key={index}
                      className="bg-white border border-gray-200 rounded-lg px-3 py-2 flex items-center justify-between group hover:border-indigo-300 transition-colors"
                    >
                      <span className="font-semibold text-gray-900">{grNo}</span>
                      {isEditing && (
                        <button
                          onClick={() => handleRemoveGrNumber(grNo)}
                          className="text-red-600 hover:text-red-800 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove this GR number"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange-600" />
              Metadata
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Created At:</span>
                <span className="font-semibold text-gray-900">
                  {format(new Date(editedBill.created_at), 'dd/MM/yyyy HH:mm')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Created By:</span>
                <span className="font-semibold text-gray-900">
                  {editedBill.created_user?.name || editedBill.created_user?.username || 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Updated At:</span>
                <span className="font-semibold text-gray-900">
                  {format(new Date(editedBill.updated_at), 'dd/MM/yyyy HH:mm')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Updated By:</span>
                <span className="font-semibold text-gray-900">
                  {editedBill.updated_user?.name || editedBill.updated_user?.username || 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Printed Status:</span>
                <span className={`font-semibold ${editedBill.printed_yet ? 'text-green-600' : 'text-orange-600'}`}>
                  {editedBill.printed_yet ? '✓ Printed' : '✗ Not Printed'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 p-4 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {!editedBill.printed_yet && !isEditing && (
              <button
                onClick={handleMarkPrinted}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-semibold"
              >
                <Printer className="w-4 h-4" />
                Mark as Printed
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditedBill({
                      ...bill,
                      gr_numbers: Array.isArray(bill.gr_numbers) ? bill.gr_numbers : []
                    });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || editedBill.gr_numbers.length === 0}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>Saving...</>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-gray-700"
                >
                  Close
                </button>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2 font-semibold"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Bill
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
