'use client';

import React from 'react';
import { X, FileText, AlertCircle, Calendar, MapPin, Package, Truck, Building2, CheckCircle, Clock, User } from 'lucide-react';
import { format } from 'date-fns';

const ComplaintViewModal = ({ complaint, onClose }) => {
  if (!complaint) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'dd MMM yyyy, hh:mm a');
    } catch {
      return 'N/A';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'REGISTERED':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'INVESTIGATING':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'LOCATED':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'IN_TRANSIT':
        return 'bg-indigo-100 text-indigo-700 border-indigo-300';
      case 'RESOLVED':
        return 'bg-emerald-100 text-emerald-700 border-emerald-300';
      case 'CLOSED':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div 
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b-2 border-slate-200 bg-gradient-to-r from-orange-600 to-red-600 px-4 py-3 text-white">
          <div>
            <h2 className="text-xl font-black">{complaint.complaint_no}</h2>
            <p className="text-sm text-orange-100">GR No: {complaint.gr_no}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg bg-white/20 p-2 transition hover:bg-white/30"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Status & Priority */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border-2 border-slate-200 bg-slate-50 p-3">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">Status</p>
              <span className={`inline-block rounded-full border px-3 py-1 text-sm font-bold uppercase ${getStatusColor(complaint.status)}`}>
                {complaint.status}
              </span>
            </div>
            <div className="rounded-lg border-2 border-slate-200 bg-slate-50 p-3">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">Priority</p>
              <span className={`inline-block rounded-full px-3 py-1 text-sm font-bold uppercase ${
                complaint.priority === 'URGENT' ? 'bg-red-100 text-red-700' :
                complaint.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                complaint.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                'bg-green-100 text-green-700'
              }`}>
                {complaint.priority}
              </span>
            </div>
          </div>

          {/* Complaint Details */}
          <div className="rounded-lg border-2 border-orange-200 bg-orange-50 p-4">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              Complaint Details
            </h3>
            <div className="space-y-2">
              <div>
                <p className="text-xs font-semibold text-slate-500">Type</p>
                <p className="text-sm font-bold text-slate-900">{complaint.complaint_type?.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">Description</p>
                <p className="text-sm text-slate-800">{complaint.complaint_description || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Delivery Milestones */}
          <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
              <Truck className="h-4 w-4 text-blue-600" />
              Delivery Milestones
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
                complaint.is_out_for_delivery ? 'bg-green-100 border-2 border-green-300' : 'bg-white border-2 border-slate-200'
              }`}>
                <Truck className={`h-4 w-4 ${complaint.is_out_for_delivery ? 'text-green-700' : 'text-slate-400'}`} />
                <span className={`text-sm font-semibold ${complaint.is_out_for_delivery ? 'text-green-700' : 'text-slate-500'}`}>
                  Out for Delivery
                </span>
                {complaint.is_out_for_delivery && <CheckCircle className="h-4 w-4 text-green-700 ml-auto" />}
              </div>
              
              <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
                complaint.is_at_hub ? 'bg-green-100 border-2 border-green-300' : 'bg-white border-2 border-slate-200'
              }`}>
                <Building2 className={`h-4 w-4 ${complaint.is_at_hub ? 'text-green-700' : 'text-slate-400'}`} />
                <span className={`text-sm font-semibold ${complaint.is_at_hub ? 'text-green-700' : 'text-slate-500'}`}>
                  At Hub
                </span>
                {complaint.is_at_hub && <CheckCircle className="h-4 w-4 text-green-700 ml-auto" />}
              </div>
              
              <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
                complaint.is_out_for_delivery_from_hub ? 'bg-green-100 border-2 border-green-300' : 'bg-white border-2 border-slate-200'
              }`}>
                <Truck className={`h-4 w-4 ${complaint.is_out_for_delivery_from_hub ? 'text-green-700' : 'text-slate-400'}`} />
                <span className={`text-sm font-semibold ${complaint.is_out_for_delivery_from_hub ? 'text-green-700' : 'text-slate-500'}`}>
                  Out from Hub
                </span>
                {complaint.is_out_for_delivery_from_hub && <CheckCircle className="h-4 w-4 text-green-700 ml-auto" />}
              </div>
              
              <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
                complaint.is_delivered_at_destination ? 'bg-green-100 border-2 border-green-300' : 'bg-white border-2 border-slate-200'
              }`}>
                <MapPin className={`h-4 w-4 ${complaint.is_delivered_at_destination ? 'text-green-700' : 'text-slate-400'}`} />
                <span className={`text-sm font-semibold ${complaint.is_delivered_at_destination ? 'text-green-700' : 'text-slate-500'}`}>
                  Delivered at Destination
                </span>
                {complaint.is_delivered_at_destination && <CheckCircle className="h-4 w-4 text-green-700 ml-auto" />}
              </div>
            </div>
          </div>

          {/* Transit Info */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border-2 border-slate-200 bg-slate-50 p-3">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">Destination City</p>
              <p className="text-sm font-bold text-green-700">{complaint.destination_city || 'N/A'}</p>
            </div>
            <div className="rounded-lg border-2 border-slate-200 bg-slate-50 p-3">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">Challan No</p>
              <p className="text-sm font-bold text-slate-900">{complaint.challan_no || 'N/A'}</p>
            </div>
          </div>

          {/* Dates */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border-2 border-slate-200 bg-slate-50 p-3">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">Expected Delivery</p>
              <p className="text-sm font-bold text-slate-900">{complaint.expected_delivery_date || 'N/A'}</p>
            </div>
            <div className="rounded-lg border-2 border-slate-200 bg-slate-50 p-3">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">Actual Delivery</p>
              <p className="text-sm font-bold text-slate-900">
                {complaint.actual_delivery_date ? formatDate(complaint.actual_delivery_date) : 'N/A'}
              </p>
            </div>
          </div>

          {/* Resolution Notes */}
          {complaint.resolution_notes && (
            <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Resolution Notes
              </h3>
              <p className="text-sm text-slate-800">{complaint.resolution_notes}</p>
            </div>
          )}

          {/* Timestamps */}
          <div className="rounded-lg border-2 border-slate-200 bg-slate-50 p-3">
            <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Clock className="h-3 w-3" />
              Timeline
            </h3>
            <div className="space-y-1 text-xs">
              <p className="text-slate-600">
                <span className="font-semibold">Created:</span> {formatDate(complaint.created_at)}
              </p>
              <p className="text-slate-600">
                <span className="font-semibold">Updated:</span> {formatDate(complaint.updated_at)}
              </p>
              {complaint.resolved_at && (
                <p className="text-green-700">
                  <span className="font-semibold">Resolved:</span> {formatDate(complaint.resolved_at)}
                </p>
              )}
              {complaint.closed_at && (
                <p className="text-slate-600">
                  <span className="font-semibold">Closed:</span> {formatDate(complaint.closed_at)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t-2 border-slate-200 bg-slate-50 px-4 py-3">
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-slate-600 px-4 py-2.5 font-bold text-white transition hover:bg-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComplaintViewModal;
