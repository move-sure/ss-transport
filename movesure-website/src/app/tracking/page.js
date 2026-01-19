'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '../../app/utils/supabase';
import { useAuth } from '../utils/auth';
import Navbar from '@/components/dashboard/navbar';
import TrackingSearch from '@/components/tracking/tracking-search';
import BiltyDetailsDisplay from '@/components/tracking/bilty-details-display';
import ChallanDetailsDisplay from '@/components/tracking/challan-details-display';
import ChallanTrackingSection from '@/components/tracking/challan-tracking-section';
import ComplaintsSection from '@/components/tracking/complaints-section';
import { FileText, Package, Truck } from 'lucide-react';

export default function TrackingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [trackingMode, setTrackingMode] = useState('bilty');
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
  const [complaints, setComplaints] = useState([]);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [complaintsLoaded, setComplaintsLoaded] = useState(false);
  const [branchesLoaded, setBranchesLoaded] = useState(false);

  // Initial load - only fetch bilties
  useEffect(() => {
    if (user) {
      fetchBilties(user);
    }
  }, [user]);

  // Lazy load branches when challan mode is activated
  useEffect(() => {
    if (user && trackingMode === 'challan' && !branchesLoaded) {
      fetchBranches();
    }
  }, [user, trackingMode, branchesLoaded]);

  // Lazy load complaints when complaints mode is activated
  useEffect(() => {
    if (user && trackingMode === 'complaints' && !complaintsLoaded) {
      fetchComplaints();
    }
  }, [user, trackingMode, complaintsLoaded]);

  const fetchBranches = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .order('branch_name');

      if (error) throw error;
      setBranches(data || []);
      setBranchesLoaded(true);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  }, []);

  const fetchComplaints = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComplaints(data || []);
      setComplaintsLoaded(true);
    } catch (error) {
      console.error('Error fetching complaints:', error);
    }
  }, []);useCallback(async (currentUser) => {
    try {
      // Fetch user's branch_id from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('branch_id')
        .eq('id', currentUser.id)
        .single();

      if (userError) throw userError;

      // Fetch only recent bilties (last 100) to reduce load time
      const { data, error } = await supabase
        .from('bilty')
        .select('*')
        .eq('branch_id', userData.branch_id)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('bilty_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      setBilties(data || []);
    } catch (error) {
      console.error('Error fetching bilties:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelectBilty = useCallback(async (bilty) => {
    setSelectedBilty(bilty);
    
    // Reset challan-related states
    setChallanDetails(null);
    setTruck(null);
    setDriver(null);
    setOwner(null);
    setCreatedByUser(null);
    
    try {
      // Parallel fetch: transit details and created by user
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

      // Fetch challan details if transit details has challan_no
      if (transitData && transitData.challan_no) {
        const { data: challanData, error: challanError } = await supabase
          .from('challan_details')
          .select('*')
          .eq('challan_no', transitData.challan_no)
          .single();

        if (!challanError) {
          setChallanDetails(challanData);

          // Parallel fetch: truck, driver, and owner details
          const fetchPromises = [];
          
          if (challanData.truck_id) {
            fetchPromises.push(
              supabase.from('trucks').select('*').eq('id', challanData.truck_id).single()
            );
          }
          if (challanData.driver_id) {
            fetchPromises.push(
              supabase.from('staff').select('*').eq('id', challanData.driver_id).single()
            );
          }
          if (challanData.owner_id) {
            fetchPromises.push(
              supabase.from('staff').select('*').eq('id', challanData.owner_id).single()
            );
          }

          if (fetchPromises.length > 0) {
            const results = await Promise.all(fetchPromises);
            let index = 0;
            if (challanData.truck_id) setTruck(results[index++].data || null);
            if (challanData.driver_id) setDriver(results[index++].data || null);
            if (challanData.owner_id) setOwner(results[index++].data || null);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching bilty details:', error);
    }
  }, []) }
  };

  const handleBiltyUpdate = (updatedBilty) => {
    setSelectedBilty(updatedBilty);
    // Update in the bilties list as well
    setBilties(prev => prev.map(b => b.id === updatedBilty.id ? updatedBilty : b));
  };

  const handleComplaintCreated = (grNo = null) => {
    fetchComplaints();
    setTrackingMode('complaints');
    if (grNo) {
      setSelectedComplaint({ gr_no: grNo, isNew: true });
    }
  };

  const handleViewComplaint = (complaint) => {
    setSelectedComplaint(complaint);
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
  }useCallback((updatedBilty) => {
    setSelectedBilty(updatedBilty);
    setBilties(prev => prev.map(b => b.id === updatedBilty.id ? updatedBilty : b));
  }, []);

  const handleComplaintCreated = useCallback((grNo = null) => {
    fetchComplaints();
    setTrackingMode('complaints');
    if (grNo) {
      setSelectedComplaint({ gr_no: grNo, isNew: true });
    }
  }, [fetchComplaints]);

  const handleViewComplaint = useCallback((complaint) => {
    setSelectedComplaint(complaint);
  }, [])               : 'Track challans and view all associated bilties'}
              </p>
            </div>
            
            <div className="flex gap-2">
              {/* Transport Change Button */}
              <button
                onClick={() => router.push('/tracking/transport-change')}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold bg-gradient-to-r from-green-600 to-teal-600 text-white hover:from-green-700 hover:to-teal-700 shadow-lg transition-all"
              >
                <Truck className="h-4 w-4" />
                <span className="hidden sm:inline">Transport Change</span>
              </button>
              
              {/* Mode Toggle */}
              <div className="flex gap-2 rounded-xl border-2 border-slate-200 bg-white p-1 shadow-sm">
                <button
                  onClick={() => setTrackingMode('bilty')}
                  className={`inline-flex items-center gap-2 rounded-lg px-2 py-2 text-xs sm:text-sm font-semibold transition ${
                    trackingMode === 'bilty'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Bilty</span>
                </button>
                <button
                  onClick={() => setTrackingMode('challan')}
                  className={`inline-flex items-center gap-2 rounded-lg px-2 py-2 text-xs sm:text-sm font-semibold transition ${
                    trackingMode === 'challan'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Package className="h-4 w-4" />
                  <span className="hidden sm:inline">Challan</span>
                </button>
                <button
                  onClick={() => setTrackingMode('complaints')}
                  className={`inline-flex items-center gap-2 rounded-lg px-2 py-2 text-xs sm:text-sm font-semibold transition ${
                    trackingMode === 'complaints'
                      ? 'bg-orange-600 text-white shadow-md'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  🚨
                  <span className="hidden sm:inline">Complaints</span>
                </button>
              </div>
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
                onComplaintCreated={handleComplaintCreated}
              />
            </div>
          </>
        ) : trackingMode === 'challan' ? (
          <div className="px-2">
            <ChallanTrackingSection 
              user={user} 
              branches={branches}
              onComplaintCreated={handleComplaintCreated}
            />
          </div>
        ) : (
          <div className="px-2">
            <ComplaintsSection 
              complaints={complaints}
              onViewComplaint={handleViewComplaint}
              onComplaintCreated={handleComplaintCreated}
              user={user}
              selectedComplaint={selectedComplaint}
              onClearSelection={() => setSelectedComplaint(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
