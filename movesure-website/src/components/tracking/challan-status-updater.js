'use client';

import React, { useState } from 'react';
import supabase from '../../app/utils/supabase';
import { Package, Truck, MapPin, CheckCircle, Loader2 } from 'lucide-react';

const ChallanStatusUpdater = ({ challanNo, currentStatus, onStatusUpdate }) => {
  const [updating, setUpdating] = useState(false);
  const [activeStatus, setActiveStatus] = useState(null);

  const statusOptions = [
    {
      id: 'out_of_hub',
      label: 'Out of Hub',
      icon: Truck,
      color: 'amber',
      field: 'is_out_of_delivery_from_branch1',
      description: 'Challan has left the origin hub',
    },
    {
      id: 'at_destination',
      label: 'At Destination',
      icon: MapPin,
      color: 'indigo',
      field: 'is_delivered_at_branch2',
      description: 'Reached destination branch',
    },
    {
      id: 'out_for_delivery',
      label: 'Out for Delivery',
      icon: Package,
      color: 'blue',
      field: 'is_out_of_delivery_from_branch2',
      description: 'Out for final delivery',
    },
    {
      id: 'delivered',
      label: 'Delivered',
      icon: CheckCircle,
      color: 'emerald',
      field: 'is_delivered_at_destination',
      description: 'Successfully delivered to consignee',
    },
  ];

  const getCurrentStatusIndex = () => {
    if (!currentStatus) return -1;
    
    if (currentStatus.is_delivered_at_destination) return 3;
    if (currentStatus.is_out_of_delivery_from_branch2) return 2;
    if (currentStatus.is_delivered_at_branch2) return 1;
    if (currentStatus.is_out_of_delivery_from_branch1) return 0;
    
    return -1;
  };

  const currentStatusIndex = getCurrentStatusIndex();

  const handleStatusUpdate = async (status, index) => {
    if (updating) return;
    
    setActiveStatus(status.id);
    setUpdating(true);

    try {
      // Fetch all bilties in this challan
      const { data: transitData, error: fetchError } = await supabase
        .from('transit_details')
        .select('gr_no')
        .eq('challan_no', challanNo);

      if (fetchError) throw fetchError;

      if (!transitData || transitData.length === 0) {
        throw new Error('No bilties found in this challan');
      }

      const grNumbers = transitData.map(t => t.gr_no);

      // Prepare the update object based on status progression
      const updateData = {};
      
      // Set all previous statuses to true as well
      if (index >= 0) {
        updateData.is_out_of_delivery_from_branch1 = true;
        updateData.out_of_delivery_from_branch1_datetime = new Date().toISOString();
      }
      if (index >= 1) {
        updateData.is_delivered_at_branch2 = true;
        updateData.delivered_at_branch2_datetime = new Date().toISOString();
      }
      if (index >= 2) {
        updateData.is_out_of_delivery_from_branch2 = true;
        updateData.out_of_delivery_from_branch2_datetime = new Date().toISOString();
      }
      if (index >= 3) {
        updateData.is_delivered_at_destination = true;
        updateData.delivered_at_destination_datetime = new Date().toISOString();
      }

      // Update all transit details for bilties in this challan
      const { error: updateError } = await supabase
        .from('transit_details')
        .update(updateData)
        .in('gr_no', grNumbers);

      if (updateError) throw updateError;

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
    if (isCompleted) {
      return {
        container: `bg-${color}-50 border-${color}-300`,
        icon: `text-${color}-700`,
        text: `text-${color}-900`,
        badge: `bg-${color}-600 text-white`,
      };
    }
    if (isActive) {
      return {
        container: 'bg-gradient-to-br from-indigo-500 to-purple-600 border-indigo-600 shadow-xl scale-105',
        icon: 'text-white',
        text: 'text-white',
        badge: 'bg-white text-indigo-600',
      };
    }
    return {
      container: 'bg-white border-slate-300 hover:border-indigo-400 hover:shadow-md',
      icon: 'text-slate-400',
      text: 'text-slate-600',
      badge: 'bg-slate-200 text-slate-600',
    };
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4 rounded-xl border-2 border-indigo-200 shadow-lg">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
          <Package className="w-5 h-5 text-indigo-600" />
          Update Challan Status
        </h3>
        <p className="text-xs text-slate-600">
          Click on a status to update all bilties in this challan
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statusOptions.map((status, index) => {
          const Icon = status.icon;
          const isCompleted = index <= currentStatusIndex;
          const isActive = activeStatus === status.id;
          const canUpdate = !updating;
          const colors = getColorClasses(status.color, isActive, isCompleted);

          return (
            <button
              key={status.id}
              onClick={() => handleStatusUpdate(status, index)}
              disabled={!canUpdate}
              className={`relative p-4 rounded-xl border-2 transition-all duration-300 ${colors.container} ${
                canUpdate ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
              }`}
            >
              {/* Status Badge */}
              {isCompleted && (
                <div className="absolute -top-2 -right-2">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${colors.badge} shadow-lg`}>
                    <CheckCircle className="w-4 h-4" />
                  </div>
                </div>
              )}

              {/* Icon */}
              <div className="flex justify-center mb-2">
                {updating && isActive ? (
                  <Loader2 className={`w-8 h-8 animate-spin ${colors.icon}`} />
                ) : (
                  <Icon className={`w-8 h-8 ${colors.icon}`} />
                )}
              </div>

              {/* Label */}
              <div className={`text-sm font-bold text-center mb-1 ${colors.text}`}>
                {status.label}
              </div>

              {/* Description */}
              <div className={`text-[10px] text-center ${colors.text} opacity-80`}>
                {status.description}
              </div>

              {/* Progress Indicator */}
              {isCompleted && (
                <div className="mt-2">
                  <div className="h-1 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full"></div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="mt-4 relative">
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-500 ease-out"
            style={{ width: `${((currentStatusIndex + 1) / statusOptions.length) * 100}%` }}
          ></div>
        </div>
        <p className="text-center text-xs text-slate-600 mt-2 font-semibold">
          Progress: {currentStatusIndex + 1} of {statusOptions.length} stages completed
        </p>
      </div>

      {updating && (
        <div className="mt-3 p-3 bg-indigo-100 border border-indigo-300 rounded-lg">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
            <span className="text-sm font-semibold text-indigo-900">
              Updating status for all bilties in challan...
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChallanStatusUpdater;
