'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  }, []);

  // Initial load
  useEffect(() => {
    if (user) {
      setLoading(false);
    }
  }, [user]);

  // Lazy load branches when challan mode is activated
  useEffect(() => {
    if (user && trackingMode === 'challan' && !branchesLoaded) {
      fetchBranches();
    }
  }, [user, trackingMode, branchesLoaded, fetchBranches]);

  // Lazy load complaints when complaints mode is activated
  useEffect(() => {
    if (user && trackingMode === 'complaints' && !complaintsLoaded) {
      fetchComplaints();
    }
  }, [user, trackingMode, complaintsLoaded, fetchComplaints]);

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

  const handleComplaintCreated = useCallback((grNo = null) => {
    fetchComplaints();
    setTrackingMode('complaints');
    if (grNo) {
      setSelectedComplaint({ gr_no: grNo, isNew: true });
    }
  }, [fetchComplaints]);

  const handleViewComplaint = useCallback((complaint) => {
    setSelectedComplaint(complaint);
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
      <div className="p-2">
        {/* Header with Toggle */}
        <div className="mb-3 px-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-0.5">
                {trackingMode === 'bilty' ? '📦Tracking' : '🚚Tracking'}
              </h1>
              <p className="text-xs text-gray-600">
                {trackingMode === 'bilty' 
                  ? 'Search and track individual bilties in real-time' 
                  : 'Track challans and view all associated bilties'}
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
            <div className="mb-3 px-2">
              <TrackingSearch
                onSelectBilty={handleSelectBilty}
                user={user}
              />
            </div>
            <div className="px-2">
              <BiltyDetailsDisplay
                bilty={selectedBilty}
                transitDetails={transitDetails}
                createdByUser={createdByUser}
                onBiltyUpdate={handleBiltyUpdate}
                onComplaintCreated={handleComplaintCreated}
                challanDetails={challanDetails}
                truck={truck}
                driver={driver}
                owner={owner}
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
