'use client';

import React, { useState, useEffect } from 'react';
import { X, Truck, User, Calendar, Package, FileText, MapPin, Phone, IdCard, Fuel, Weight } from 'lucide-react';
import supabase from '../../app/utils/supabase';

export default function ChallanDetailsModal({ challanNo, isOpen, onClose }) {
  const [loading, setLoading] = useState(false);
  const [challanDetails, setChallanDetails] = useState(null);
  const [truckDetails, setTruckDetails] = useState(null);
  const [ownerDetails, setOwnerDetails] = useState(null);
  const [driverDetails, setDriverDetails] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && challanNo) {
      fetchChallanDetails();
    }
  }, [isOpen, challanNo]);

  const fetchChallanDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch challan details
      const { data: challan, error: challanError } = await supabase
        .from('challan_details')
        .select('*')
        .eq('challan_no', challanNo)
        .single();

      if (challanError) throw challanError;
      setChallanDetails(challan);

      // Fetch truck details if truck_id exists
      if (challan?.truck_id) {
        const { data: truck, error: truckError } = await supabase
          .from('trucks')
          .select('*')
          .eq('id', challan.truck_id)
          .single();

        if (!truckError && truck) {
          setTruckDetails(truck);
        }
      }

      // Fetch owner details if owner_id exists
      if (challan?.owner_id) {
        const { data: owner, error: ownerError } = await supabase
          .from('staff')
          .select('*')
          .eq('id', challan.owner_id)
          .single();

        if (!ownerError && owner) {
          setOwnerDetails(owner);
        }
      }

      // Fetch driver details if driver_id exists
      if (challan?.driver_id) {
        const { data: driver, error: driverError } = await supabase
          .from('staff')
          .select('*')
          .eq('id', challan.driver_id)
          .single();

        if (!driverError && driver) {
          setDriverDetails(driver);
        }
      }
    } catch (err) {
      console.error('Error fetching challan details:', err);
      setError('Failed to load challan details');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">Challan Details</h2>
              <p className="text-blue-100 text-sm">Challan No: {challanNo}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Loading challan details...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <p className="text-red-700">{error}</p>
              <button
                onClick={fetchChallanDetails}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          ) : challanDetails ? (
            <div className="space-y-6">
              {/* Challan Basic Info */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Challan Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 uppercase mb-1">Challan Number</p>
                    <p className="text-sm font-bold text-slate-900">{challanDetails.challan_no}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase mb-1">Date</p>
                    <p className="text-sm font-medium text-slate-900">
                      {challanDetails.date ? new Date(challanDetails.date).toLocaleDateString('en-IN') : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase mb-1">Status</p>
                    <div className="flex gap-2">
                      {challanDetails.is_active ? (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">
                          Inactive
                        </span>
                      )}
                      {challanDetails.is_dispatched ? (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                          Dispatched
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-700">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                  {challanDetails.dispatch_date && (
                    <div className="md:col-span-2">
                      <p className="text-xs text-slate-500 uppercase mb-1">Dispatch Date</p>
                      <p className="text-sm font-medium text-slate-900">{formatDate(challanDetails.dispatch_date)}</p>
                    </div>
                  )}
                  {challanDetails.remarks && (
                    <div className="md:col-span-2">
                      <p className="text-xs text-slate-500 uppercase mb-1">Remarks</p>
                      <p className="text-sm text-slate-700">{challanDetails.remarks}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Truck Details */}
              {truckDetails ? (
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Truck className="w-5 h-5 text-green-600" />
                    Truck Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-1">Truck Number</p>
                      <p className="text-sm font-bold text-slate-900">{truckDetails.truck_number}</p>
                    </div>
                    {truckDetails.truck_type && (
                      <div>
                        <p className="text-xs text-slate-500 uppercase mb-1">Truck Type</p>
                        <p className="text-sm font-medium text-slate-900">{truckDetails.truck_type}</p>
                      </div>
                    )}
                    {truckDetails.brand && (
                      <div>
                        <p className="text-xs text-slate-500 uppercase mb-1">Brand</p>
                        <p className="text-sm font-medium text-slate-900">{truckDetails.brand}</p>
                      </div>
                    )}
                    {truckDetails.tyre_count && (
                      <div>
                        <p className="text-xs text-slate-500 uppercase mb-1">Tyre Count</p>
                        <p className="text-sm font-medium text-slate-900">{truckDetails.tyre_count}</p>
                      </div>
                    )}
                    {truckDetails.fuel_type && (
                      <div>
                        <p className="text-xs text-slate-500 uppercase mb-1 flex items-center gap-1">
                          <Fuel className="w-3 h-3" />
                          Fuel Type
                        </p>
                        <p className="text-sm font-medium text-slate-900">{truckDetails.fuel_type}</p>
                      </div>
                    )}
                    {truckDetails.loading_capacity && (
                      <div>
                        <p className="text-xs text-slate-500 uppercase mb-1 flex items-center gap-1">
                          <Weight className="w-3 h-3" />
                          Loading Capacity
                        </p>
                        <p className="text-sm font-medium text-slate-900">{truckDetails.loading_capacity} kg</p>
                      </div>
                    )}
                    {truckDetails.year_of_manufacturing && (
                      <div>
                        <p className="text-xs text-slate-500 uppercase mb-1">Manufacturing Year</p>
                        <p className="text-sm font-medium text-slate-900">{truckDetails.year_of_manufacturing}</p>
                      </div>
                    )}
                    {truckDetails.rc_number && (
                      <div>
                        <p className="text-xs text-slate-500 uppercase mb-1">RC Number</p>
                        <p className="text-sm font-medium text-slate-900">{truckDetails.rc_number}</p>
                      </div>
                    )}
                    {truckDetails.insurance_number && (
                      <div>
                        <p className="text-xs text-slate-500 uppercase mb-1">Insurance Number</p>
                        <p className="text-sm font-medium text-slate-900">{truckDetails.insurance_number}</p>
                      </div>
                    )}
                    {truckDetails.permit_number && (
                      <div>
                        <p className="text-xs text-slate-500 uppercase mb-1">Permit Number</p>
                        <p className="text-sm font-medium text-slate-900">{truckDetails.permit_number}</p>
                      </div>
                    )}
                    {truckDetails.current_location && (
                      <div className="md:col-span-2">
                        <p className="text-xs text-slate-500 uppercase mb-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          Current Location
                        </p>
                        <p className="text-sm font-medium text-slate-900">{truckDetails.current_location}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-1">Status</p>
                      <div className="flex gap-2">
                        {truckDetails.is_active && (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                            Active
                          </span>
                        )}
                        {truckDetails.is_available && (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                            Available
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-center">
                  <p className="text-sm text-gray-600">No truck assigned to this challan</p>
                </div>
              )}

              {/* Owner Details */}
              {ownerDetails && (
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-purple-600" />
                    Owner Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-1">Name</p>
                      <p className="text-sm font-bold text-slate-900">{ownerDetails.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-1">Post</p>
                      <p className="text-sm font-medium text-slate-900">{ownerDetails.post}</p>
                    </div>
                    {ownerDetails.mobile_number && (
                      <div>
                        <p className="text-xs text-slate-500 uppercase mb-1 flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          Mobile
                        </p>
                        <a
                          href={`tel:${ownerDetails.mobile_number}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {ownerDetails.mobile_number}
                        </a>
                      </div>
                    )}
                    {ownerDetails.aadhar_number && (
                      <div>
                        <p className="text-xs text-slate-500 uppercase mb-1 flex items-center gap-1">
                          <IdCard className="w-3 h-3" />
                          Aadhar
                        </p>
                        <p className="text-sm font-medium text-slate-900">{ownerDetails.aadhar_number}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Driver Details */}
              {driverDetails && (
                <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-amber-600" />
                    Driver Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-1">Name</p>
                      <p className="text-sm font-bold text-slate-900">{driverDetails.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-1">Post</p>
                      <p className="text-sm font-medium text-slate-900">{driverDetails.post}</p>
                    </div>
                    {driverDetails.mobile_number && (
                      <div>
                        <p className="text-xs text-slate-500 uppercase mb-1 flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          Mobile
                        </p>
                        <a
                          href={`tel:${driverDetails.mobile_number}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {driverDetails.mobile_number}
                        </a>
                      </div>
                    )}
                    {driverDetails.license_number && (
                      <div>
                        <p className="text-xs text-slate-500 uppercase mb-1 flex items-center gap-1">
                          <IdCard className="w-3 h-3" />
                          License Number
                        </p>
                        <p className="text-sm font-medium text-slate-900">{driverDetails.license_number}</p>
                      </div>
                    )}
                    {driverDetails.aadhar_number && (
                      <div>
                        <p className="text-xs text-slate-500 uppercase mb-1 flex items-center gap-1">
                          <IdCard className="w-3 h-3" />
                          Aadhar
                        </p>
                        <p className="text-sm font-medium text-slate-900">{driverDetails.aadhar_number}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <p className="text-gray-600">No challan details found</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-4 rounded-b-xl flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
