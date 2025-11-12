'use client';

import React from 'react';
import { Calendar, Edit, Package, Eye, Truck, MapPin, Building2, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

const ComplaintCard = ({ complaint, onEdit, onMarkDelivered, onView }) => {
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

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-100 text-red-700';
      case 'HIGH':
        return 'bg-orange-100 text-orange-700';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-700';
      case 'LOW':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-slate-100 text-slate-700';
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

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:border-orange-300 hover:shadow">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <p className="text-base font-black text-slate-900">{complaint.complaint_no}</p>
          <p className="text-xs text-slate-500">GR-{complaint.gr_no}</p>
        </div>
        <div className="flex flex-wrap gap-1 justify-end">
          <span className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase ${getPriorityColor(complaint.priority)}`}>
            {complaint.priority}
          </span>
          <span className={`rounded-full border px-2 py-1 text-[9px] font-bold uppercase ${getStatusColor(complaint.status)}`}>
            {complaint.status}
          </span>
        </div>
      </div>

      {/* Description */}
      <div className="mb-2 rounded-lg bg-slate-50 p-2">
        <p className="text-xs font-semibold text-slate-600">{complaint.complaint_type?.replace('_', ' ')}</p>
        <p className="mt-1 line-clamp-2 text-xs text-slate-700">{complaint.complaint_description}</p>
      </div>

      {/* Milestone Tracker - Vertical Timeline on Mobile, Horizontal on Desktop */}
      <div className="mb-2 rounded-lg border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-teal-50 p-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-blue-900">📍 Delivery Journey</p>
        
        {/* Mobile: Vertical Timeline */}
        <div className="block lg:hidden">
          <div className="relative">
            {/* Vertical Line */}
            <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-teal-400 to-teal-200"></div>
            
            <div className="space-y-3">
              {/* Step 1: Out for Delivery */}
              <div className="relative flex items-start gap-3">
                <div className={`relative z-10 flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                  complaint.is_out_for_delivery 
                    ? 'border-teal-600 bg-teal-500 shadow-lg' 
                    : 'border-slate-300 bg-white'
                }`}>
                  {complaint.is_out_for_delivery && (
                    <CheckCircle className="h-3 w-3 text-white" />
                  )}
                </div>
                <div className="flex-1 pt-0.5">
                  <p className={`text-[11px] font-bold ${complaint.is_out_for_delivery ? 'text-teal-900' : 'text-slate-500'}`}>
                    Out for Delivery
                  </p>
                </div>
              </div>

              {/* Step 2: At Hub */}
              <div className="relative flex items-start gap-3">
                <div className={`relative z-10 flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                  complaint.is_at_hub 
                    ? 'border-teal-600 bg-teal-500 shadow-lg' 
                    : 'border-slate-300 bg-white'
                }`}>
                  {complaint.is_at_hub && (
                    <CheckCircle className="h-3 w-3 text-white" />
                  )}
                </div>
                <div className="flex-1 pt-0.5">
                  <p className={`text-[11px] font-bold ${complaint.is_at_hub ? 'text-teal-900' : 'text-slate-500'}`}>
                    At Hub
                  </p>
                </div>
              </div>

              {/* Step 3: Out from Hub */}
              <div className="relative flex items-start gap-3">
                <div className={`relative z-10 flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                  complaint.is_out_for_delivery_from_hub 
                    ? 'border-teal-600 bg-teal-500 shadow-lg' 
                    : 'border-slate-300 bg-white'
                }`}>
                  {complaint.is_out_for_delivery_from_hub && (
                    <CheckCircle className="h-3 w-3 text-white" />
                  )}
                </div>
                <div className="flex-1 pt-0.5">
                  <p className={`text-[11px] font-bold ${complaint.is_out_for_delivery_from_hub ? 'text-teal-900' : 'text-slate-500'}`}>
                    Out from Hub
                  </p>
                </div>
              </div>

              {/* Step 4: Delivered */}
              <div className="relative flex items-start gap-3">
                <div className={`relative z-10 flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                  complaint.is_delivered_at_destination 
                    ? 'border-teal-600 bg-teal-500 shadow-lg' 
                    : 'border-slate-300 bg-white'
                }`}>
                  {complaint.is_delivered_at_destination && (
                    <CheckCircle className="h-3 w-3 text-white" />
                  )}
                </div>
                <div className="flex-1 pt-0.5">
                  <p className={`text-[11px] font-bold ${complaint.is_delivered_at_destination ? 'text-teal-900' : 'text-slate-500'}`}>
                    Delivered
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop: Horizontal Timeline */}
        <div className="hidden lg:block">
          <div className="relative">
            {/* Horizontal Line */}
            <div className="absolute left-6 right-6 top-[9px] h-0.5 bg-gradient-to-r from-teal-400 to-teal-200"></div>
            
            <div className="flex items-start justify-between">
              {/* Step 1: Out for Delivery */}
              <div className="relative flex flex-col items-center w-1/4">
                <div className={`relative z-10 flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                  complaint.is_out_for_delivery 
                    ? 'border-teal-600 bg-teal-500 shadow-lg' 
                    : 'border-slate-300 bg-white'
                }`}>
                  {complaint.is_out_for_delivery && (
                    <CheckCircle className="h-3 w-3 text-white" />
                  )}
                </div>
                <p className={`mt-2 text-center text-[10px] font-bold ${complaint.is_out_for_delivery ? 'text-teal-900' : 'text-slate-500'}`}>
                  Out for<br/>Delivery
                </p>
              </div>

              {/* Step 2: At Hub */}
              <div className="relative flex flex-col items-center w-1/4">
                <div className={`relative z-10 flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                  complaint.is_at_hub 
                    ? 'border-teal-600 bg-teal-500 shadow-lg' 
                    : 'border-slate-300 bg-white'
                }`}>
                  {complaint.is_at_hub && (
                    <CheckCircle className="h-3 w-3 text-white" />
                  )}
                </div>
                <p className={`mt-2 text-center text-[10px] font-bold ${complaint.is_at_hub ? 'text-teal-900' : 'text-slate-500'}`}>
                  At Hub
                </p>
              </div>

              {/* Step 3: Out from Hub */}
              <div className="relative flex flex-col items-center w-1/4">
                <div className={`relative z-10 flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                  complaint.is_out_for_delivery_from_hub 
                    ? 'border-teal-600 bg-teal-500 shadow-lg' 
                    : 'border-slate-300 bg-white'
                }`}>
                  {complaint.is_out_for_delivery_from_hub && (
                    <CheckCircle className="h-3 w-3 text-white" />
                  )}
                </div>
                <p className={`mt-2 text-center text-[10px] font-bold ${complaint.is_out_for_delivery_from_hub ? 'text-teal-900' : 'text-slate-500'}`}>
                  Out from<br/>Hub
                </p>
              </div>

              {/* Step 4: Delivered */}
              <div className="relative flex flex-col items-center w-1/4">
                <div className={`relative z-10 flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                  complaint.is_delivered_at_destination 
                    ? 'border-teal-600 bg-teal-500 shadow-lg' 
                    : 'border-slate-300 bg-white'
                }`}>
                  {complaint.is_delivered_at_destination && (
                    <CheckCircle className="h-3 w-3 text-white" />
                  )}
                </div>
                <p className={`mt-2 text-center text-[10px] font-bold ${complaint.is_delivered_at_destination ? 'text-teal-900' : 'text-slate-500'}`}>
                  Delivered
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Calendar className="h-3 w-3" />
          {formatDate(complaint.created_at)}
        </div>
        <div className="flex gap-1">
          {!complaint.is_delivered_at_destination && (
            <button
              onClick={() => onMarkDelivered && onMarkDelivered(complaint)}
              className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-2 py-1.5 text-xs font-bold text-white transition hover:bg-green-700"
              title="Mark as Delivered"
            >
              <Package className="h-3 w-3" />
              <span className="hidden sm:inline">Delivered</span>
            </button>
          )}
          <button
            onClick={() => onEdit && onEdit(complaint)}
            className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2 py-1.5 text-xs font-bold text-white transition hover:bg-indigo-700"
            title="Edit Complaint"
          >
            <Edit className="h-3 w-3" />
            <span className="hidden sm:inline">Edit</span>
          </button>
          <button
            onClick={() => onView && onView(complaint)}
            className="inline-flex items-center gap-1 rounded-lg bg-orange-600 px-2 py-1.5 text-xs font-bold text-white transition hover:bg-orange-700"
            title="View Details"
          >
            <Eye className="h-3 w-3" />
            <span className="hidden sm:inline">View</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComplaintCard;
