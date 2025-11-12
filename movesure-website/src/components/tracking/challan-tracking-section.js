'use client';

import React, { useState, useEffect } from 'react';
import supabase from '../../app/utils/supabase';
import ChallanTrackingSelector from './challan-tracking-selector';
import ChallanBiltyList from './challan-bilty-list';
import { Package, Loader2 } from 'lucide-react';

const ChallanTrackingSection = ({ user, branches = [] }) => {
  const [challans, setChallans] = useState([]);
  const [selectedChallan, setSelectedChallan] = useState(null);
  const [transitBilties, setTransitBilties] = useState([]);
  const [biltyDetails, setBiltyDetails] = useState([]);
  const [challanDetails, setChallanDetails] = useState(null);
  const [truck, setTruck] = useState(null);
  const [driver, setDriver] = useState(null);
  const [owner, setOwner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingBilties, setLoadingBilties] = useState(false);

  useEffect(() => {
    if (user) {
      fetchChallans();
    }
  }, [user]);

  const fetchChallans = async () => {
    try {
      setLoading(true);
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('branch_id')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;

      const { data, error } = await supabase
        .from('challan_details')
        .select('*')
        .eq('branch_id', userData.branch_id)
        .eq('is_active', true)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      setChallans(data || []);
    } catch (error) {
      console.error('Error fetching challans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChallanSelect = async (challan) => {
    setSelectedChallan(challan);
    setChallanDetails(challan);
    setLoadingBilties(true);

    try {
      // Fetch truck details
      if (challan.truck_id) {
        const { data: truckData } = await supabase
          .from('trucks')
          .select('*')
          .eq('id', challan.truck_id)
          .single();
        setTruck(truckData);
      } else {
        setTruck(null);
      }

      // Fetch driver details
      if (challan.driver_id) {
        const { data: driverData } = await supabase
          .from('staff')
          .select('*')
          .eq('id', challan.driver_id)
          .single();
        setDriver(driverData);
      } else {
        setDriver(null);
      }

      // Fetch owner details
      if (challan.owner_id) {
        const { data: ownerData } = await supabase
          .from('staff')
          .select('*')
          .eq('id', challan.owner_id)
          .single();
        setOwner(ownerData);
      } else {
        setOwner(null);
      }

      // Fetch transit details for this challan
      const { data: transitData, error: transitError } = await supabase
        .from('transit_details')
        .select('*')
        .eq('challan_no', challan.challan_no);

      if (transitError) throw transitError;

      setTransitBilties(transitData || []);

      // Fetch full bilty details for each transit entry
      if (transitData && transitData.length > 0) {
        const grNumbers = transitData.map(t => t.gr_no);
        
        // Fetch regular bilties
        const { data: regularBilties } = await supabase
          .from('bilty')
          .select('*')
          .in('gr_no', grNumbers);

        // Fetch station bilties
        const { data: stationBilties } = await supabase
          .from('station_bilty')
          .select('*')
          .in('gr_no', grNumbers);

        const allBilties = [
          ...(regularBilties || []).map(b => ({ ...b, bilty_type: 'regular' })),
          ...(stationBilties || []).map(b => ({ ...b, bilty_type: 'station' }))
        ];

        setBiltyDetails(allBilties);
      } else {
        setBiltyDetails([]);
      }
    } catch (error) {
      console.error('Error loading challan details:', error);
    } finally {
      setLoadingBilties(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-indigo-600" />
          <p className="mt-3 text-sm font-semibold text-slate-600">Loading challans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-4 shadow-lg">
        <div className="mb-4 flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg">
            <Package className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-slate-900 sm:text-xl">Challan Tracking</h2>
            <p className="text-xs text-slate-600">Select a challan to view all bilties</p>
          </div>
        </div>

        <ChallanTrackingSelector
          challans={challans}
          selectedChallan={selectedChallan}
          onChallanSelect={handleChallanSelect}
          challanDetails={challanDetails}
          truck={truck}
          driver={driver}
          owner={owner}
          transitBiltiesCount={transitBilties.length}
        />
      </div>

      {selectedChallan && (
        <ChallanBiltyList
          bilties={biltyDetails}
          transitDetails={transitBilties}
          loading={loadingBilties}
          branches={branches}
        />
      )}
    </div>
  );
};

export default ChallanTrackingSection;
