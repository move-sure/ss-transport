'use client';

import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../../app/utils/supabase';
import { useAuth } from '../utils/auth';
import Navbar from '@/components/dashboard/navbar';
import TrackingSearch from '@/components/tracking/tracking-search';
import BiltyDetailsDisplay from '@/components/tracking/bilty-details-display';

export default function TrackingPage() {
  const { user } = useAuth();
  const [selectedBilty, setSelectedBilty] = useState(null);
  const [transitDetails, setTransitDetails] = useState(null);
  const [challanDetails, setChallanDetails] = useState(null);
  const [truck, setTruck] = useState(null);
  const [driver, setDriver] = useState(null);
  const [owner, setOwner] = useState(null);
  const [createdByUser, setCreatedByUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setLoading(false);
    }
  }, [user]);

  const handleSelectBilty = useCallback(async (bilty) => {
    setSelectedBilty(bilty);
    setChallanDetails(null);
    setTruck(null);
    setDriver(null);
    setOwner(null);
    setCreatedByUser(null);
    
    try {
      const [transitResult, userResult] = await Promise.all([
        supabase
          .from('transit_details')
          .select('*')
          .eq('gr_no', bilty.gr_no)
          .single(),
        supabase
          .from('users')
          .select('id, username, name, post, image_url')
          .eq('id', bilty.staff_id)
          .single()
      ]);

      const transitData = transitResult.data || null;
      setTransitDetails(transitData);
      setCreatedByUser(userResult.data || null);

      if (transitData && transitData.challan_no) {
        const { data: challanData, error: challanError } = await supabase
          .from('challan_details')
          .select('*')
          .eq('challan_no', transitData.challan_no)
          .single();

        if (!challanError && challanData) {
          setChallanDetails(challanData);

          const fetchPromises = [];
          if (challanData.truck_id) {
            fetchPromises.push(
              supabase
                .from('trucks')
                .select('*')
                .eq('id', challanData.truck_id)
                .single()
                .then(result => ({ type: 'truck', data: result.data }))
            );
          }
          if (challanData.driver_id) {
            fetchPromises.push(
              supabase
                .from('staff')
                .select('*')
                .eq('id', challanData.driver_id)
                .single()
                .then(result => ({ type: 'driver', data: result.data }))
            );
          }
          if (challanData.owner_id) {
            fetchPromises.push(
              supabase
                .from('staff')
                .select('*')
                .eq('id', challanData.owner_id)
                .single()
                .then(result => ({ type: 'owner', data: result.data }))
            );
          }

          if (fetchPromises.length > 0) {
            const results = await Promise.all(fetchPromises);
            results.forEach(result => {
              if (result.type === 'truck') setTruck(result.data || null);
              if (result.type === 'driver') setDriver(result.data || null);
              if (result.type === 'owner') setOwner(result.data || null);
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching bilty details:', error);
    }
  }, []);

  const handleBiltyUpdate = useCallback((updatedBilty) => {
    setSelectedBilty(updatedBilty);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Loading tracking system...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <Navbar />
      <div className="p-4 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📦 Bilty Tracking</h1>
          <p className="text-gray-600">Search and track bilty details</p>
        </div>

        {/* Search Section */}
        <div className="mb-6">
          <TrackingSearch
            onSelectBilty={handleSelectBilty}
            user={user}
          />
        </div>

        {/* Details Section */}
        <div>
          <BiltyDetailsDisplay
            bilty={selectedBilty}
            transitDetails={transitDetails}
            createdByUser={createdByUser}
            onBiltyUpdate={handleBiltyUpdate}
            challanDetails={challanDetails}
            truck={truck}
            driver={driver}
            owner={owner}
          />
        </div>
      </div>
    </div>
  );
}
