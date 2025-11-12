'use client';

import React, { useState, useEffect } from 'react';
import supabase from '../../app/utils/supabase';
import { AlertCircle, FileText, Calendar, CheckCircle, Loader2, ArrowLeft, Package, Truck, MapPin } from 'lucide-react';

const ComplaintEdit = ({ complaint, user, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [bilty, setBilty] = useState(null);
  const [destinationCity, setDestinationCity] = useState(complaint.destination_city || '');
  
  const [formData, setFormData] = useState({
    complaint_type: complaint.complaint_type || 'LOCATION_QUERY',
    complaint_description: complaint.complaint_description || '',
    priority: complaint.priority || 'MEDIUM',
    status: complaint.status || 'INVESTIGATING',
    expected_delivery_date: complaint.expected_delivery_date || '',
    actual_delivery_date: complaint.actual_delivery_date ? new Date(complaint.actual_delivery_date).toISOString().split('T')[0] : '',
    challan_no: complaint.challan_no || '',
    is_out_for_delivery: complaint.is_out_for_delivery || false,
    is_at_hub: complaint.is_at_hub || false,
    is_out_for_delivery_from_hub: complaint.is_out_for_delivery_from_hub || false,
    is_delivered_at_destination: complaint.is_delivered_at_destination || false,
    resolution_notes: complaint.resolution_notes || '',
  });

  useEffect(() => {
    fetchBiltyDetails();
  }, []);

  const fetchBiltyDetails = async () => {
    try {
      const { data: biltyData, error: biltyError } = await supabase
        .from('bilty')
        .select('*')
        .eq('id', complaint.bilty_id)
        .single();

      if (!biltyError && biltyData) {
        setBilty(biltyData);
        
        if (biltyData.to_city_id) {
          const { data: cityData } = await supabase
            .from('cities')
            .select('city_name')
            .eq('id', biltyData.to_city_id)
            .single();
          
          if (cityData) {
            setDestinationCity(cityData.city_name);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching bilty:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updateData = {
        ...formData,
        destination_city: destinationCity,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      };

      // Set resolved_at if status is RESOLVED or CLOSED
      if ((formData.status === 'RESOLVED' || formData.status === 'CLOSED') && !complaint.resolved_at) {
        updateData.resolved_at = new Date().toISOString();
        updateData.resolved_by = user.id;
      }

      // Set closed_at if status is CLOSED
      if (formData.status === 'CLOSED' && !complaint.closed_at) {
        updateData.closed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('complaints')
        .update(updateData)
        .eq('id', complaint.id);

      if (error) throw error;

      alert('Complaint updated successfully!');
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error updating complaint:', error);
      alert('Failed to update complaint. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkDelivered = async () => {
    if (!confirm('Mark this complaint as delivered and resolved?')) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('complaints')
        .update({
          is_delivered_at_destination: true,
          actual_delivery_date: new Date().toISOString(),
          status: 'RESOLVED',
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', complaint.id);

      if (error) throw error;

      alert('Complaint marked as delivered!');
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error marking delivered:', error);
      alert('Failed to mark as delivered. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="rounded-xl border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-red-50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">Edit Complaint</h2>
            <p className="text-sm font-bold text-orange-700">{complaint.complaint_no}</p>
            <p className="text-xs text-slate-600">GR No: {complaint.gr_no}</p>
          </div>
          <button
            onClick={handleMarkDelivered}
            disabled={loading || formData.is_delivered_at_destination}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white shadow-lg transition hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {formData.is_delivered_at_destination ? '✅ Delivered' : '📦 Mark Delivered'}
          </button>
        </div>
      </div>

      {/* Bilty Info */}
      {bilty && (
        <div className="rounded-xl border-2 border-indigo-200 bg-white p-4">
          <div className="mb-2 flex items-center gap-2 border-b border-slate-200 pb-2">
            <FileText className="h-5 w-5 text-indigo-600" />
            <span className="font-bold text-slate-900">Bilty Information</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold text-slate-500">Consignor</p>
              <p className="text-sm font-bold text-slate-900">{bilty.consignor_name}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Consignee</p>
              <p className="text-sm font-bold text-slate-900">{bilty.consignee_name}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Destination</p>
              <p className="text-sm font-bold text-green-700">{destinationCity}</p>
            </div>
          </div>
        </div>
      )}

      {/* Edit Form */}
      <form onSubmit={handleSubmit} className="rounded-xl border-2 border-slate-200 bg-white p-4">
        <div className="space-y-4">
          {/* Status and Priority Row */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Status *
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full rounded-lg border-2 border-slate-200 bg-white px-3 py-2 text-sm font-semibold focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                required
              >
                <option value="REGISTERED">📝 Registered</option>
                <option value="INVESTIGATING">🔍 Investigating</option>
                <option value="LOCATED">📍 Located</option>
                <option value="IN_TRANSIT">🚚 In Transit</option>
                <option value="RESOLVED">✅ Resolved</option>
                <option value="CLOSED">🔒 Closed</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Priority *
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full rounded-lg border-2 border-slate-200 bg-white px-3 py-2 text-sm font-semibold focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                required
              >
                <option value="LOW">🟢 Low</option>
                <option value="MEDIUM">🟡 Medium</option>
                <option value="HIGH">🟠 High</option>
                <option value="URGENT">🔴 Urgent</option>
              </select>
            </div>
          </div>

          {/* Complaint Type */}
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
              Complaint Type *
            </label>
            <select
              value={formData.complaint_type}
              onChange={(e) => setFormData({ ...formData, complaint_type: e.target.value })}
              className="w-full rounded-lg border-2 border-slate-200 bg-white px-3 py-2 text-sm font-semibold focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              required
            >
              <option value="LOCATION_QUERY">📍 Location Query</option>
              <option value="DELAY">⏰ Delivery Delay</option>
              <option value="DAMAGE">📦 Damage Report</option>
              <option value="MISSING">❌ Missing Items</option>
              <option value="OTHER">📝 Other Issue</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
              Complaint Description *
            </label>
            <textarea
              value={formData.complaint_description}
              onChange={(e) => setFormData({ ...formData, complaint_description: e.target.value })}
              rows={3}
              className="w-full rounded-lg border-2 border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              required
            />
          </div>

          {/* Transit Status Checkboxes */}
          <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-3">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900">
              <Truck className="h-4 w-4 text-blue-600" />
              Transit Status
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_out_for_delivery}
                  onChange={(e) => setFormData({ ...formData, is_out_for_delivery: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className="text-sm font-semibold text-slate-700">Out for Delivery</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_at_hub}
                  onChange={(e) => setFormData({ ...formData, is_at_hub: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className="text-sm font-semibold text-slate-700">At Hub</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_out_for_delivery_from_hub}
                  onChange={(e) => setFormData({ ...formData, is_out_for_delivery_from_hub: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className="text-sm font-semibold text-slate-700">Out from Hub</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_delivered_at_destination}
                  onChange={(e) => setFormData({ ...formData, is_delivered_at_destination: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className="text-sm font-semibold text-slate-700">Delivered at Destination</span>
              </label>
            </div>
          </div>

          {/* Challan Number */}
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
              Challan Number
            </label>
            <input
              type="text"
              value={formData.challan_no}
              onChange={(e) => setFormData({ ...formData, challan_no: e.target.value })}
              className="w-full rounded-lg border-2 border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="Enter challan number"
            />
          </div>

          {/* Dates */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Expected Delivery Date
              </label>
              <input
                type="date"
                value={formData.expected_delivery_date}
                onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
                className="w-full rounded-lg border-2 border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Actual Delivery Date
              </label>
              <input
                type="date"
                value={formData.actual_delivery_date}
                onChange={(e) => setFormData({ ...formData, actual_delivery_date: e.target.value })}
                className="w-full rounded-lg border-2 border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
          </div>

          {/* Resolution Notes */}
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
              Resolution Notes
            </label>
            <textarea
              value={formData.resolution_notes}
              onChange={(e) => setFormData({ ...formData, resolution_notes: e.target.value })}
              rows={3}
              className="w-full rounded-lg border-2 border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="Add resolution details, actions taken, etc."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-lg border-2 border-slate-300 bg-white px-4 py-2.5 font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft className="inline h-4 w-4 mr-1" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 font-bold text-white shadow-lg transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="inline h-4 w-4 animate-spin mr-1" />
                  Updating...
                </>
              ) : (
                <>
                  <CheckCircle className="inline h-4 w-4 mr-1" />
                  Update Complaint
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ComplaintEdit;
