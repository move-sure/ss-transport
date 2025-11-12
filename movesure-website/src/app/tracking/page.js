'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '../../app/utils/supabase';
import { useAuth } from '../utils/auth';
import Navbar from '@/components/dashboard/navbar';
import TrackingSearch from '@/components/tracking/tracking-search';
import BiltyDetailsDisplay from '@/components/tracking/bilty-details-display';
import ChallanDetailsDisplay from '@/components/tracking/challan-details-display';
import ChallanTrackingSection from '@/components/tracking/challan-tracking-section';
import { FileText, Package } from 'lucide-react';

export default function TrackingPage() {
  const router = useRouter();
  const { user } = useAuth(); // Use the auth context instead of checking manually
  const [trackingMode, setTrackingMode] = useState('bilty'); // 'bilty' or 'challan'
  const [bilties, setBilties] = useState([]);
  const [branches, setBranches] = useState([]);
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
      fetchBilties(user);
      fetchBranches();
    }
  }, [user]);

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .order('branch_name');

      if (error) throw error;
      setBranches(data || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const fetchBilties = async (currentUser) => {
    try {
      // Fetch user's branch_id from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('branch_id')
        .eq('id', currentUser.id)
        .single();

      if (userError) throw userError;

      // Fetch bilties for user's branch
      const { data, error } = await supabase
        .from('bilty')
        .select('*')
        .eq('branch_id', userData.branch_id)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('bilty_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      setBilties(data || []);
    } catch (error) {
      console.error('Error fetching bilties:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBilty = async (bilty) => {
    setSelectedBilty(bilty);
    
    // Reset challan-related states
    setChallanDetails(null);
    setTruck(null);
    setDriver(null);
    setOwner(null);
    
    // Fetch transit details for the selected bilty
    let transitData = null;
    try {
      const { data, error } = await supabase
        .from('transit_details')
        .select('*')
        .eq('gr_no', bilty.gr_no)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching transit details:', error);
      }

      transitData = data || null;
      setTransitDetails(transitData);
    } catch (error) {
      console.error('Error fetching transit details:', error);
      setTransitDetails(null);
    }

    // Fetch challan details if transit details has challan_no
    if (transitData && transitData.challan_no) {
      try {
        const { data: challanData, error: challanError } = await supabase
          .from('challan_details')
          .select('*')
          .eq('challan_no', transitData.challan_no)
          .single();

        if (challanError && challanError.code !== 'PGRST116') {
          console.error('Error fetching challan details:', challanError);
        }

        setChallanDetails(challanData || null);

        // Fetch truck details if available
        if (challanData && challanData.truck_id) {
          const { data: truckData, error: truckError } = await supabase
            .from('trucks')
            .select('*')
            .eq('id', challanData.truck_id)
            .single();

          if (truckError && truckError.code !== 'PGRST116') {
            console.error('Error fetching truck details:', truckError);
          }

          setTruck(truckData || null);
        }

        // Fetch driver details if available
        if (challanData && challanData.driver_id) {
          const { data: driverData, error: driverError } = await supabase
            .from('staff')
            .select('*')
            .eq('id', challanData.driver_id)
            .single();

          if (driverError && driverError.code !== 'PGRST116') {
            console.error('Error fetching driver details:', driverError);
          }

          setDriver(driverData || null);
        }

        // Fetch owner details if available
        if (challanData && challanData.owner_id) {
          const { data: ownerData, error: ownerError } = await supabase
            .from('staff')
            .select('*')
            .eq('id', challanData.owner_id)
            .single();

          if (ownerError && ownerError.code !== 'PGRST116') {
            console.error('Error fetching owner details:', ownerError);
          }

          setOwner(ownerData || null);
        }
      } catch (error) {
        console.error('Error fetching challan details:', error);
      }
    }

    // Fetch user who created the bilty
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, username, name, post, image_url')
        .eq('id', bilty.staff_id)
        .single();

      if (userError && userError.code !== 'PGRST116') {
        console.error('Error fetching user details:', userError);
      }

      setCreatedByUser(userData || null);
    } catch (error) {
      console.error('Error fetching user details:', error);
      setCreatedByUser(null);
    }
  };

  const handleBiltyUpdate = (updatedBilty) => {
    setSelectedBilty(updatedBilty);
    // Update in the bilties list as well
    setBilties(prev => prev.map(b => b.id === updatedBilty.id ? updatedBilty : b));
  };

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
      <div className="p-2">
        {/* Header with Toggle */}
        <div className="mb-3 px-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-0.5">
                {trackingMode === 'bilty' ? '📦 Bilty Tracking' : '🚚 Challan Tracking'}
              </h1>
              <p className="text-xs text-gray-600">
                {trackingMode === 'bilty' 
                  ? 'Search and track individual bilties in real-time' 
                  : 'Track challans and view all associated bilties'}
              </p>
            </div>
            
            {/* Mode Toggle */}
            <div className="flex gap-2 rounded-xl border-2 border-slate-200 bg-white p-1 shadow-sm">
              <button
                onClick={() => setTrackingMode('bilty')}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  trackingMode === 'bilty'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <FileText className="h-4 w-4" />
                Bilty Tracking
              </button>
              <button
                onClick={() => setTrackingMode('challan')}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  trackingMode === 'challan'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Package className="h-4 w-4" />
                Challan Tracking
              </button>
            </div>
          </div>
        </div>

        {/* Content Based on Mode */}
        {trackingMode === 'bilty' ? (
          <>
            {/* Search Section */}
            <div className="mb-3 px-2">
              <TrackingSearch
                onSelectBilty={handleSelectBilty}
                bilties={bilties}
              />
            </div>

            {/* Details Section */}
            <div className="px-2">
              {/* Challan Details - Show above bilty details */}
              {selectedBilty && challanDetails && (
                <ChallanDetailsDisplay
                  challanDetails={challanDetails}
                  truck={truck}
                  driver={driver}
                  owner={owner}
                />
              )}
              
              {/* Bilty Details */}
              <BiltyDetailsDisplay
                bilty={selectedBilty}
                transitDetails={transitDetails}
                createdByUser={createdByUser}
                onBiltyUpdate={handleBiltyUpdate}
              />
            </div>
          </>
        ) : (
          <div className="px-2">
            <ChallanTrackingSection user={user} branches={branches} />
          </div>
        )}
      </div>
    </div>
  );
}
