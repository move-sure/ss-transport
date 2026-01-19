'use client';

import React, { useState } from 'react';
import supabase from '../../app/utils/supabase';
import { Package, MapPin, CheckCircle, Loader2, Truck } from 'lucide-react';

const BiltyStatusUpdater = ({ grNo, biltyId, currentStatus, onStatusUpdate, user }) => {
  const [updating, setUpdating] = useState(false);
  const [activeStatus, setActiveStatus] = useState(null);

  const statusOptions = [
    {
      id: 'at_hub',
      label: 'At Hub',
      icon: Package,
      color: 'amber',
      field: 'is_at_hub',
      description: 'Bilty at hub',
    },
    {
      id: 'out_for_delivery_from_hub',
      label: 'Out from Hub',
      icon: Truck,
      color: 'blue',
      field: 'is_out_for_delivery_from_hub',
      description: 'Left the hub',
    },
    {
      id: 'out_for_delivery',
      label: 'Out for Delivery',
      icon: MapPin,
      color: 'indigo',
      field: 'is_out_for_delivery',
      description: 'Out for delivery',
    },
    {
      id: 'delivered',
      label: 'Delivered',
      icon: CheckCircle,
      color: 'emerald',
      field: 'is_delivered_at_destination',
      description: 'Delivered successfully',
    },
  ];

  const getCurrentStatusIndex = () => {
    if (!currentStatus) return -1;
    
    if (currentStatus.is_delivered_at_destination) return 3;
    if (currentStatus.is_out_for_delivery) return 2;
    if (currentStatus.is_out_for_delivery_from_hub) return 1;
    if (currentStatus.is_at_hub) return 0;
    
    return -1;
  };

  const currentStatusIndex = getCurrentStatusIndex();

  const handleStatusUpdate = async (status, index) => {
    if (updating) return;
    
    setActiveStatus(status.id);
    setUpdating(true);

    try {
      // Check if complaint exists for this GR number
      const { data: existingComplaint, error: fetchError } = await supabase
        .from('complaints')
        .select('*')
        .eq('gr_no', grNo)
        .maybeSingle();

      if (fetchError) throw fetchError;

      // Prepare the update object based on status
      const updateData = {
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      };
      
      // Set all previous statuses to true as well
      if (index >= 0) {
        updateData.is_at_hub = true;
      }
      if (index >= 1) {
        updateData.is_out_for_delivery_from_hub = true;
      }
      if (index >= 2) {
        updateData.is_out_for_delivery = true;
      }
      if (index >= 3) {
        updateData.is_delivered_at_destination = true;
        updateData.actual_delivery_date = new Date().toISOString();
        updateData.status = 'DELIVERED';
        updateData.resolved_at = new Date().toISOString();
        updateData.resolved_by = user?.id;
      }

      if (existingComplaint) {
        // Update existing complaint
        const { error: updateError } = await supabase
          .from('complaints')
          .update(updateData)
          .eq('id', existingComplaint.id);

        if (updateError) throw updateError;
      } else {
        // Create new complaint for tracking
        const { error: insertError } = await supabase
          .from('complaints')
          .insert({
            complaint_no: `TRACK-${grNo}-${Date.now()}`,
            gr_no: grNo,
            bilty_id: biltyId,
            complaint_type: 'TRACKING',
            complaint_description: 'Auto-created for delivery tracking',
            priority: 'LOW',
            status: updateData.status || 'IN_TRANSIT',
            created_by: user?.id,
            ...updateData,
          });

        if (insertError) throw insertError;
      }

      // Call the callback to refresh parent component
      if (onStatusUpdate) {
        onStatusUpdate();
      }

    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status: ' + error.message);
    } finally {
      setUpdating(false);
      setActiveStatus(null);
    }
  };

  const getColorClasses = (color, isActive, isCompleted) => {
    const colors = {
      amber: {
        completed: 'bg-amber-100 border-amber-400 text-amber-800',
        active: 'bg-gradient-to-br from-amber-500 to-orange-600 border-amber-600 text-white shadow-lg scale-105',
        default: 'bg-white border-slate-300 text-slate-600 hover:border-amber-400 hover:shadow-md',
      },
      blue: {
        completed: 'bg-blue-100 border-blue-400 text-blue-800',
        active: 'bg-gradient-to-br from-blue-500 to-indigo-600 border-blue-600 text-white shadow-lg scale-105',
        default: 'bg-white border-slate-300 text-slate-600 hover:border-blue-400 hover:shadow-md',
      },
      indigo: {
        completed: 'bg-indigo-100 border-indigo-400 text-indigo-800',
        active: 'bg-gradient-to-br from-indigo-500 to-purple-600 border-indigo-600 text-white shadow-lg scale-105',
        default: 'bg-white border-slate-300 text-slate-600 hover:border-indigo-400 hover:shadow-md',
      },
      emerald: {
        completed: 'bg-emerald-100 border-emerald-400 text-emerald-800',
        active: 'bg-gradient-to-br from-emerald-500 to-green-600 border-emerald-600 text-white shadow-lg scale-105',
        default: 'bg-white border-slate-300 text-slate-600 hover:border-emerald-400 hover:shadow-md',
      },
    };

    if (isCompleted) return colors[color].completed;
    if (isActive) return colors[color].active;
    return colors[color].default;
  };

  return (
    <div className="mt-2 p-2 bg-gradient-to-br from-slate-50 to-indigo-50 rounded-lg border border-slate-200">
      <div className="mb-2">
        <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">Update Status</p>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {statusOptions.map((status, index) => {
          const Icon = status.icon;
          const isCompleted = index <= currentStatusIndex;
          const isActive = activeStatus === status.id;
          const canUpdate = !updating;
          const colorClass = getColorClasses(status.color, isActive, isCompleted);

          return (
            <button
              key={status.id}
              onClick={() => handleStatusUpdate(status, index)}
              disabled={!canUpdate}
              className={`relative p-2 rounded-lg border-2 transition-all duration-300 ${colorClass} ${
                canUpdate ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
              }`}
              title={status.description}
            >
              {/* Status Badge */}
              {isCompleted && (
                <div className="absolute -top-1 -right-1">
                  <div className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-600 text-white shadow-md">
                    <CheckCircle className="w-2.5 h-2.5" />
                  </div>
                </div>
              )}

              {/* Icon */}
              <div className="flex justify-center mb-1">
                {updating && isActive ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </div>

              {/* Label */}
              <div className="text-[9px] font-bold text-center leading-tight">
                {status.label}
              </div>
            </button>
          );
        })}
      </div>

      {/* Progress Indicator */}
      <div className="mt-2">
        <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 via-blue-500 to-emerald-500 transition-all duration-500 ease-out"
            style={{ width: `${((currentStatusIndex + 1) / statusOptions.length) * 100}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default BiltyStatusUpdater;
