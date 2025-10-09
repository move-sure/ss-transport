'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../utils/auth';
import supabase from '../utils/supabase';
import { format } from 'date-fns';
import { AlertCircle, RefreshCw } from 'lucide-react';

// Import components
import Navbar from '../../components/dashboard/navbar';
import TransitHeader from '../../components/transit/TransitHeader';
import ChallanSelector from '../../components/transit/ChallanSelector';
import BiltyList from '../../components/transit/BiltyList';
import SelectedBiltiesSummary from '../../components/transit/SelectedBiltiesSummary';
import ChallanPDFPreview from '../../components/transit/ChallanPDFPreview';

export default function TransitManagement() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
    // Data states
  const [bilties, setBilties] = useState([]);
  const [stationBilties, setStationBilties] = useState([]);
  const [transitBilties, setTransitBilties] = useState([]);
  const [challans, setChallans] = useState([]);
  const [challanBooks, setChallanBooks] = useState([]);
  const [cities, setCities] = useState([]);
  const [userBranch, setUserBranch] = useState(null);
  const [trucks, setTrucks] = useState([]);
  const [staff, setStaff] = useState([]);
  const [branches, setBranches] = useState([]);
  const [permanentDetails, setPermanentDetails] = useState(null);
  const [totalAvailableCount, setTotalAvailableCount] = useState(0);
  const [filteredAvailableCount, setFilteredAvailableCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(1000); // Large page size for challan management
    // Selection states
  const [selectedChallan, setSelectedChallan] = useState(null);
  const [selectedChallanBook, setSelectedChallanBook] = useState(null);
  const [selectedBilties, setSelectedBilties] = useState([]);
  const [selectedTransitBilties, setSelectedTransitBilties] = useState([]);

  // PDF Preview states
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfPreviewType, setPdfPreviewType] = useState(null); // 'loading' or 'challan'
  // Sort function for GR numbers to handle alphanumeric sorting properly
  const sortByGRNumber = (a, b) => {
    const grA = a.gr_no || '';
    const grB = b.gr_no || '';
    
    // Extract alphabetic prefix and numeric part
    const matchA = grA.match(/^([A-Za-z]*)(\d+)(.*)$/);
    const matchB = grB.match(/^([A-Za-z]*)(\d+)(.*)$/);
    
    if (!matchA && !matchB) return grA.localeCompare(grB);
    if (!matchA) return 1;
    if (!matchB) return -1;
    
    const [, prefixA, numberA, suffixA] = matchA;
    const [, prefixB, numberB, suffixB] = matchB;
    
    // First compare prefixes
    const prefixCompare = prefixA.localeCompare(prefixB);
    if (prefixCompare !== 0) return prefixCompare;
    
    // Then compare numbers numerically
    const numCompare = parseInt(numberA) - parseInt(numberB);
    if (numCompare !== 0) return numCompare;
    
    // Finally compare suffixes
    return suffixA.localeCompare(suffixB);
  };

  // Sort function for destination city names alphabetically
  const sortByDestinationCity = (a, b) => {
    const cityA = (a.to_city_name || '').toUpperCase();
    const cityB = (b.to_city_name || '').toUpperCase();
    
    // First sort by destination city alphabetically
    const cityCompare = cityA.localeCompare(cityB);
    if (cityCompare !== 0) return cityCompare;
    
    // If same city, then sort by GR number
    const grA = a.gr_no || '';
    const grB = b.gr_no || '';
    
    // Extract alphabetic prefix and numeric part for GR number sorting
    const matchA = grA.match(/^([A-Za-z]*)(\d+)(.*)$/);
    const matchB = grB.match(/^([A-Za-z]*)(\d+)(.*)$/);
    
    if (!matchA && !matchB) return grA.localeCompare(grB);
    if (!matchA) return 1;
    if (!matchB) return -1;
    
    const [, prefixA, numberA, suffixA] = matchA;
    const [, prefixB, numberB, suffixB] = matchB;
    
    // First compare prefixes
    const prefixCompare = prefixA.localeCompare(prefixB);
    if (prefixCompare !== 0) return prefixCompare;
    
    // Then compare numbers numerically
    const numCompare = parseInt(numberA) - parseInt(numberB);
    if (numCompare !== 0) return numCompare;
    
    // Finally compare suffixes
    return suffixA.localeCompare(suffixB);
  };

  // Load initial data
  useEffect(() => {
    if (user?.branch_id) {
      loadInitialData();
    }
  }, [user]);

  // Load transit bilties when challan is selected
  useEffect(() => {
    if (selectedChallan) {
      loadTransitBilties(selectedChallan.challan_no);
    } else {
      setTransitBilties([]);
    }
  }, [selectedChallan]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading data for branch:', user.branch_id);
      
      // Load basic data first
      const [
        userBranchRes,
        citiesRes,
        challansRes,
        challanBooksRes,
        trucksRes,
        staffRes,
        branchesRes,
        permanentDetailsRes
      ] = await Promise.all([
        supabase
          .from('branches')
          .select('*')
          .eq('id', user.branch_id)
          .single(),
        supabase
          .from('cities')
          .select('*')
          .order('city_name'),
        supabase
          .from('challan_details')
          .select(`
            id, challan_no, branch_id, truck_id, owner_id, driver_id, date,
            total_bilty_count, remarks, is_active, is_dispatched, dispatch_date,
            created_by, created_at, updated_at,
            truck:trucks(id, truck_number, truck_type),
            owner:staff!challan_details_owner_id_fkey(id, name, mobile_number),
            driver:staff!challan_details_driver_id_fkey(id, name, mobile_number, license_number)
          `)
          .eq('branch_id', user.branch_id)
          .eq('is_active', true)
          .order('is_dispatched', { ascending: true })
          .order('created_at', { ascending: false }),
        supabase
          .from('challan_books')
          .select('*')
          .eq('from_branch_id', user.branch_id)
          .eq('is_active', true)
          .eq('is_completed', false)
          .order('created_at', { ascending: false }),
        supabase
          .from('trucks')
          .select('*')
          .eq('is_active', true)
          .order('truck_number'),
        supabase
          .from('staff')
          .select('*')
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('branches')
          .select('*')
          .eq('is_active', true)
          .order('branch_name'),
        supabase
          .from('permanent_details')
          .select('*')
          .eq('branch_id', user.branch_id)
          .single()
      ]);

      // Handle errors
      if (userBranchRes.error) throw new Error(`Branch error: ${userBranchRes.error.message}`);
      if (citiesRes.error) throw new Error(`Cities error: ${citiesRes.error.message}`);
      if (challansRes.error) throw new Error(`Challans error: ${challansRes.error.message}`);
      if (challanBooksRes.error) throw new Error(`Challan books error: ${challanBooksRes.error.message}`);

      // Set basic data
      setUserBranch(userBranchRes.data);
      setCities(citiesRes.data || []);
      setTrucks(trucksRes.data || []);
      setStaff(staffRes.data || []);
      setChallans(challansRes.data || []);
      setChallanBooks(challanBooksRes.data || []);
      setBranches(branchesRes.data || []);
      setPermanentDetails(permanentDetailsRes.data || null);

      console.log('Basic data loaded, now loading available bilties...');
      
      // Load available bilties using the new function
      await loadAvailableBilties();
      
      // Auto-select the most recent active (non-dispatched) challan first, fallback to dispatched
      const activeChallans = (challansRes.data || []).filter(c => !c.is_dispatched);
      const dispatchedChallans = (challansRes.data || []).filter(c => c.is_dispatched);
      
      if (activeChallans.length > 0) {
        const recentChallan = activeChallans[0];
        setSelectedChallan(recentChallan);
        console.log('Auto-selected recent active challan:', recentChallan.challan_no);
      } else if (dispatchedChallans.length > 0) {
        const recentDispatchedChallan = dispatchedChallans[0];
        setSelectedChallan(recentDispatchedChallan);
        console.log('Auto-selected recent dispatched challan:', recentDispatchedChallan.challan_no, '(READ-ONLY)');
      }
      
      // Auto-select first available challan book
      if (challanBooksRes.data?.length > 0) {
        setSelectedChallanBook(challanBooksRes.data[0]);
      }
      
    } catch (error) {
      console.error('Error loading data:', error);
      setError(error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableBilties = async (page = 1) => {
    try {
      console.log('🔄 Loading available bilties using database function...');
      
      const offset = (page - 1) * pageSize;
      
      // Get total count and available GR numbers
      const [countRes, availableGrRes] = await Promise.all([
        supabase.rpc('get_available_gr_count'),
        supabase.rpc('get_available_gr_numbers', {
          p_limit: pageSize,
          p_offset: offset
        })
      ]);

      if (countRes.error) throw countRes.error;
      if (availableGrRes.error) throw availableGrRes.error;

      setTotalAvailableCount(countRes.data || 0);
      
      if (!availableGrRes.data || availableGrRes.data.length === 0) {
        setBilties([]);
        setStationBilties([]);
        return;
      }

      // Separate GR numbers by source table
      const biltyGrNumbers = availableGrRes.data
        .filter(item => item.source_table === 'bilty')
        .map(item => item.gr_no);
      
      const summaryGrNumbers = availableGrRes.data
        .filter(item => item.source_table === 'station_bilty_summary')
        .map(item => item.gr_no);

      // Fetch detailed information for each type
      const biltyPromises = [];
      const summaryPromises = [];

      if (biltyGrNumbers.length > 0) {
        biltyPromises.push(
          supabase
            .from('bilty')
            .select(`
              id, gr_no, bilty_date, consignor_name, consignee_name,
              payment_mode, no_of_pkg, total, to_city_id, wt, rate,
              freight_amount, branch_id, saving_option, created_at,
              contain, e_way_bill, pvt_marks, consignor_gst, consignor_number,
              consignee_gst, consignee_number, transport_name, transport_gst,
              transport_number, delivery_type, invoice_no, invoice_value,
              invoice_date, document_number, labour_charge, bill_charge,
              toll_charge, dd_charge, other_charge, remark
            `)
            .in('gr_no', biltyGrNumbers)
            .eq('branch_id', user.branch_id)
            .eq('is_active', true)
            .eq('saving_option', 'SAVE')
        );
      }

      if (summaryGrNumbers.length > 0) {
        summaryPromises.push(
          supabase
            .from('station_bilty_summary')
            .select(`
              id, station, gr_no, consignor, consignee, contents,
              no_of_packets, weight, payment_status, amount, pvt_marks,
              e_way_bill, created_at, updated_at
            `)
            .in('gr_no', summaryGrNumbers)
        );
      }

      // Execute queries
      const [biltyResponses, summaryResponses] = await Promise.all([
        Promise.all(biltyPromises),
        Promise.all(summaryPromises)
      ]);

      // Process bilty data
      const processedBilties = biltyResponses.flatMap(response => {
        if (response.error) throw response.error;
        return (response.data || []).map(bilty => {
          const city = cities.find(c => c.id === bilty.to_city_id);
          return {
            ...bilty,
            to_city_name: city?.city_name || 'Unknown',
            to_city_code: city?.city_code || 'N/A',
            destination: city?.city_name || 'Unknown',
            source: 'bilty',
            bilty_type: bilty.delivery_type || 'Regular'
          };
        });
      }).sort(sortByGRNumber);

      // Process summary data
      const processedStationBilties = summaryResponses.flatMap(response => {
        if (response.error) throw response.error;
        return (response.data || []).map(stationBilty => {
          const city = cities.find(c => c.city_code === stationBilty.station);
          return {
            id: stationBilty.id,
            gr_no: stationBilty.gr_no,
            bilty_date: stationBilty.created_at,
            consignor_name: stationBilty.consignor,
            consignee_name: stationBilty.consignee,
            contain: stationBilty.contents,
            no_of_pkg: stationBilty.no_of_packets,
            wt: stationBilty.weight,
            total: stationBilty.amount,
            payment_mode: stationBilty.payment_status,
            to_city_name: city?.city_name || stationBilty.station,
            to_city_code: stationBilty.station,
            destination: city?.city_name || stationBilty.station,
            e_way_bill: stationBilty.e_way_bill,
            pvt_marks: stationBilty.pvt_marks,
            created_at: stationBilty.created_at,
            source: 'station_bilty_summary',
            bilty_type: 'Station Summary'
          };
        });
      }).sort(sortByGRNumber);

      console.log('✅ Available bilties loaded:', {
        regularBilties: processedBilties.length,
        stationBilties: processedStationBilties.length,
        total: processedBilties.length + processedStationBilties.length,
        totalAvailable: countRes.data
      });

      setBilties(processedBilties);
      setStationBilties(processedStationBilties);
      setCurrentPage(page);

    } catch (error) {
      console.error('Error loading available bilties:', error);
      throw error;
    }
  };  const loadTransitBilties = async (challanNo) => {
    try {
      console.log('🔄 Loading transit bilties for challan:', challanNo);
      
      // Get transit details for this challan (NO MORE FOREIGN KEY JOINS)
      const { data: transitData, error } = await supabase
        .from('transit_details')
        .select(`
          id, challan_no, gr_no, bilty_id, from_branch_id, to_branch_id,
          is_out_of_delivery_from_branch1, is_delivered_at_branch2,
          is_delivered_at_destination, created_at
        `)
        .eq('challan_no', challanNo)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error loading transit details:', error);
        setTransitBilties([]);
        return;
      }

      if (!transitData || transitData.length === 0) {
        console.log('📝 No transit records found for challan:', challanNo);
        setTransitBilties([]);
        return;
      }

      console.log('📊 Transit records found:', transitData.length);

      // Get all GR numbers for this challan
      const grNumbers = transitData.map(t => t.gr_no).filter(Boolean);
      
      console.log('🔍 Looking up GR numbers:', grNumbers);

      // Fetch bilties by GR numbers from both tables
      const [regularBiltiesRes, stationBiltiesRes] = await Promise.all([
        // Regular bilties by GR number
        grNumbers.length > 0 ? supabase
          .from('bilty')
          .select(`
            id, gr_no, bilty_date, consignor_name, consignee_name,
            payment_mode, no_of_pkg, total, to_city_id, wt, rate,
            freight_amount, created_at, contain, e_way_bill, pvt_marks,
            consignor_gst, consignor_number, consignee_gst, consignee_number,
            transport_name, transport_gst, transport_number, delivery_type,
            invoice_no, invoice_value, invoice_date, document_number,
            labour_charge, bill_charge, toll_charge, dd_charge, other_charge, remark
          `)
          .in('gr_no', grNumbers) : Promise.resolve({ data: [] }),

        // Station bilties by GR number
        grNumbers.length > 0 ? supabase
          .from('station_bilty_summary')
          .select(`
            id, station, gr_no, consignor, consignee, contents,
            no_of_packets, weight, payment_status, amount, pvt_marks,
            e_way_bill, created_at, updated_at
          `)
          .in('gr_no', grNumbers) : Promise.resolve({ data: [] })
      ]);

      // Check if this challan is dispatched
      const challan = challans.find(c => c.challan_no === challanNo);
      const isFromDispatchedChallan = challan?.is_dispatched || false;

      const processedTransitBilties = [];

      // Process regular bilties
      if (regularBiltiesRes.data?.length > 0) {
        console.log('📋 Regular bilties found:', regularBiltiesRes.data.length);
        console.log('🔍 Regular bilty GR numbers:', regularBiltiesRes.data.map(b => b.gr_no));
        
        regularBiltiesRes.data.forEach(bilty => {
          const transitRecord = transitData.find(t => t.gr_no === bilty.gr_no); // Match by GR number
          const city = cities.find(c => c.id === bilty.to_city_id);
          
          console.log(`📝 Processing regular bilty ${bilty.gr_no}:`, {
            biltyId: bilty.id,
            transitRecord: transitRecord ? 'Found' : 'Not Found',
            transitId: transitRecord?.id
          });
          
          processedTransitBilties.push({
            ...bilty,
            transit_id: transitRecord?.id,
            challan_no: transitRecord?.challan_no,
            to_city_name: city?.city_name || 'Unknown',
            to_city_code: city?.city_code || 'N/A',
            in_transit: true,
            bilty_type: 'regular',
            source: 'bilty', // Add source field for consistency
            is_dispatched: isFromDispatchedChallan,
            is_out_of_delivery_from_branch1: transitRecord?.is_out_of_delivery_from_branch1,
            is_delivered_at_branch2: transitRecord?.is_delivered_at_branch2,
            is_delivered_at_destination: transitRecord?.is_delivered_at_destination
          });
        });
      } else {
        console.log('📋 No regular bilties found for this challan');
      }

      // Process station bilties (exclude those that match regular bilty GR numbers to avoid duplicates)
      if (stationBiltiesRes.data?.length > 0) {
        console.log('📋 Station bilties found:', stationBiltiesRes.data.length);
        const regularBiltyGRs = new Set((regularBiltiesRes.data || []).map(b => b.gr_no));
        
        stationBiltiesRes.data.forEach(stationBilty => {
          // Skip if this GR number already exists in regular bilties
          if (regularBiltyGRs.has(stationBilty.gr_no)) {
            console.log(`⚠️ Skipping station bilty ${stationBilty.gr_no} - already exists as regular bilty`);
            return;
          }

          const transitRecord = transitData.find(t => t.gr_no === stationBilty.gr_no);
          const city = cities.find(c => c.city_code === stationBilty.station);
          
          console.log(`📝 Processing station bilty ${stationBilty.gr_no}:`, {
            stationBiltyId: stationBilty.id,
            transitRecord: transitRecord ? 'Found' : 'Not Found',
            transitId: transitRecord?.id
          });
          
          processedTransitBilties.push({
            ...stationBilty,
            transit_id: transitRecord?.id,
            challan_no: transitRecord?.challan_no,
            bilty_date: stationBilty.created_at,
            consignor_name: stationBilty.consignor,
            consignee_name: stationBilty.consignee,
            payment_mode: stationBilty.payment_status,
            no_of_pkg: stationBilty.no_of_packets,
            total: stationBilty.amount,
            wt: stationBilty.weight,
            contain: stationBilty.contents,
            to_city_name: city?.city_name || stationBilty.station,
            to_city_code: stationBilty.station,
            in_transit: true,
            bilty_type: 'station',
            source: 'station_bilty_summary', // Add source field for consistency
            is_dispatched: isFromDispatchedChallan,
            is_out_of_delivery_from_branch1: transitRecord?.is_out_of_delivery_from_branch1,
            is_delivered_at_branch2: transitRecord?.is_delivered_at_branch2,
            is_delivered_at_destination: transitRecord?.is_delivered_at_destination
          });
        });
      } else {
        console.log('📋 No station bilties found for this challan');
      }

      // Sort by destination city alphabetically
      const sortedTransitBilties = processedTransitBilties.sort(sortByDestinationCity);

      setTransitBilties(sortedTransitBilties);
      console.log('✅ Transit bilties loaded successfully:', sortedTransitBilties.length, `(Dispatched: ${sortedTransitBilties.filter(b => b.is_dispatched).length})`);
      console.log('🎯 Transit bilties sorted by destination city alphabetically');
      
    } catch (error) {
      console.error('❌ Error loading transit bilties:', error);
      setTransitBilties([]);
    }
  };// Enhanced refresh function with better filtering logic
  // FIXES IMPLEMENTED:
  // 1. Removed branch filter from transit query to get ALL transit records 
  // 2. Removed LIMIT 100 to get all available bilties  // 3. Added comprehensive logging for debugging
  // 4. Enhanced filtering logic with better error handling
  // 5. Added refresh buttons to both available and transit sections
  const refreshData = useCallback(async (refreshType = 'all') => {
    try {
      console.log('🔄 Refreshing data:', refreshType);
      
      if (refreshType === 'all' || refreshType === 'bilties') {
        console.log('🔍 Refreshing available bilties using database function...');
        await loadAvailableBilties(currentPage);
      }

      if (refreshType === 'all' || refreshType === 'transit') {
        if (selectedChallan) {
          await loadTransitBilties(selectedChallan.challan_no);
        }
      }

      if (refreshType === 'all' || refreshType === 'challans') {
        const { data: challansRes } = await supabase
          .from('challan_details')
          .select(`
            id, challan_no, branch_id, truck_id, owner_id, driver_id, date,
            total_bilty_count, remarks, is_active, is_dispatched, dispatch_date,
            created_by, created_at, updated_at,
            truck:trucks(id, truck_number, truck_type),
            owner:staff!challan_details_owner_id_fkey(id, name, mobile_number),
            driver:staff!challan_details_driver_id_fkey(id, name, mobile_number, license_number)
          `)
          .eq('branch_id', user.branch_id)
          .eq('is_active', true)
          .order('is_dispatched', { ascending: true })
          .order('created_at', { ascending: false });

        setChallans(challansRes || []);

        if (selectedChallan && challansRes) {
          const updatedChallan = challansRes.find(c => c.id === selectedChallan.id);
          if (updatedChallan) {
            setSelectedChallan(updatedChallan);
          }
        }
      }

      console.log('✅ Data refresh completed for:', refreshType);
    } catch (error) {
      console.error('❌ Error refreshing data:', error);
      setError(error.message || 'Failed to refresh data');
    }
  }, [user.branch_id, cities, selectedChallan, currentPage, loadAvailableBilties]);

  const handleAddBiltyToTransit = async (biltyOrBilties) => {
    if (!selectedChallan || !selectedChallanBook) {
      alert('Please select a challan and challan book');
      return;
    }

    if (selectedChallan.is_dispatched) {
      alert('Cannot add bilties to a dispatched challan');
      return;
    }

    // Handle both single bilty and array of bilties
    const biltiesArray = Array.isArray(biltyOrBilties) ? biltyOrBilties : [biltyOrBilties];
    
    if (biltiesArray.length === 0) {
      alert('No bilties to add');
      return;
    }

    try {
      setSaving(true);

      // Get the destination branch from challan book
      const toBranchId = selectedChallanBook.to_branch_id;

      // NOTE: The schema for transit_details table needs bilty_id to allow NULL
      // for station bilties. Update schema: ALTER TABLE transit_details ALTER COLUMN bilty_id DROP NOT NULL;

      // Prepare transit details data
      const transitData = biltiesArray.map(bilty => ({
        challan_no: selectedChallan.challan_no,
        gr_no: bilty.gr_no,
        bilty_id: bilty.source === 'bilty' ? bilty.id : null, // Use source instead of bilty_type
        challan_book_id: selectedChallanBook.id,
        from_branch_id: user.branch_id,
        to_branch_id: toBranchId,
        is_out_of_delivery_from_branch1: false,
        out_of_delivery_from_branch1_date: null,
        is_delivered_at_branch2: false,
        delivered_at_branch2_date: null,
        is_out_of_delivery_from_branch2: false,
        out_of_delivery_from_branch2_date: null,
        is_delivered_at_destination: false,
        delivered_at_destination_date: null,
        out_for_door_delivery: false,
        out_for_door_delivery_date: null,
        delivery_agent_name: null,
        delivery_agent_phone: null,
        vehicle_number: null,
        remarks: null,
        created_by: user.id,
        updated_by: null
      }));

      // Insert transit details
      const { error: transitError } = await supabase
        .from('transit_details')
        .insert(transitData);

      if (transitError) {
        console.error('Transit error:', transitError);
        alert('Error adding bilties to transit: ' + transitError.message);
        return;
      }

      console.log('✅ Successfully inserted transit data:', {
        count: transitData.length,
        challanNo: selectedChallan.challan_no,
        grNumbers: transitData.map(t => t.gr_no),
        biltyIds: transitData.map(t => t.bilty_id).filter(Boolean)
      });

      // Update challan bilty count only
      const newBiltyCount = selectedChallan.total_bilty_count + biltiesArray.length;
      await supabase
        .from('challan_details')
        .update({ total_bilty_count: newBiltyCount })
        .eq('id', selectedChallan.id);

      // Note: We don't update challan book current number here
      // Challan book is only for creating new challans, not for managing bilties

      alert(`Successfully added ${biltiesArray.length} bilty(s) to challan ${selectedChallan.challan_no}`);
      
      // Clear selections and refresh data in proper order
      setSelectedBilties([]);
      setSelectedTransitBilties([]);
      
      // Refresh available bilties first to remove the added bilties
      await refreshData('bilties');
      // Then refresh transit bilties to show the newly added ones
      await refreshData('transit');
      // Finally refresh challans to update counts
      await refreshData('challans');

    } catch (error) {
      console.error('Error adding to transit:', error);
      alert('Error adding bilties to transit. Please try again.');
    } finally {
      setSaving(false);
    }
  };  const handleRemoveBiltyFromTransit = async (bilty) => {
    if (!bilty.transit_id) return;

    if (selectedChallan?.is_dispatched) {
      alert('Cannot remove bilties from a dispatched challan');
      return;
    }

    try {
      const confirmRemove = window.confirm(`Remove ${bilty.gr_no} from challan ${bilty.challan_no}?`);
      if (!confirmRemove) return;

      setSaving(true);

      console.log(`🗑️ Removing bilty ${bilty.gr_no} from transit:`, {
        biltyId: bilty.id,
        transitId: bilty.transit_id,
        challanNo: bilty.challan_no,
        biltyType: bilty.bilty_type
      });

      // Delete the transit details record completely
      const { error } = await supabase
        .from('transit_details')
        .delete()
        .eq('id', bilty.transit_id);

      if (error) {
        console.error('Error removing bilty from transit:', error);
        alert('Error removing bilty from transit');
        return;
      }

      console.log(`✅ Successfully removed ${bilty.gr_no} from transit table`);

      // Update challan bilty count
      if (selectedChallan) {
        const newBiltyCount = Math.max(0, selectedChallan.total_bilty_count - 1);
        await supabase
          .from('challan_details')
          .update({ total_bilty_count: newBiltyCount })
          .eq('id', selectedChallan.id);
        
        console.log(`📊 Updated challan bilty count to: ${newBiltyCount}`);
      }

      alert(`Successfully removed ${bilty.gr_no} from challan`);
      
      // Refresh data efficiently with logging
      console.log('🔄 Refreshing data after bilty removal...');
      await refreshData('bilties');
      await refreshData('transit');
      await refreshData('challans');
        // Refresh data after removal
      await refreshData('transit');
      await refreshData('challans');

    } catch (error) {
      console.error('Error removing bilty from transit:', error);
      alert('Error removing bilty from transit');
    } finally {
      setSaving(false);
    }
  };  const handleBulkRemoveFromTransit = async () => {
    if (selectedTransitBilties.length === 0) {
      alert('No transit bilties selected for removal');
      return;
    }

    if (selectedChallan?.is_dispatched) {
      alert('Cannot remove bilties from a dispatched challan');
      return;
    }

    try {
      const confirmRemove = window.confirm(
        `Remove ${selectedTransitBilties.length} selected bilty(s) from challan ${selectedChallan?.challan_no}?`
      );
      if (!confirmRemove) return;

      setSaving(true);

      console.log(`🗑️ Bulk removing ${selectedTransitBilties.length} bilties from transit:`, 
        selectedTransitBilties.map(b => ({ grNo: b.gr_no, transitId: b.transit_id }))
      );

      // Delete all selected transit bilties completely
      const transitIds = selectedTransitBilties.map(bilty => bilty.transit_id).filter(Boolean);
      
      if (transitIds.length === 0) {
        alert('No valid transit IDs found');
        return;
      }

      const { error } = await supabase
        .from('transit_details')
        .delete()
        .in('id', transitIds);

      if (error) {
        console.error('Error bulk removing bilties from transit:', error);
        alert('Error removing bilties from transit');
        return;
      }

      console.log(`✅ Successfully bulk removed ${selectedTransitBilties.length} bilties from transit table`);

      // Update challan bilty count
      if (selectedChallan) {
        const newBiltyCount = Math.max(0, selectedChallan.total_bilty_count - selectedTransitBilties.length);
        await supabase
          .from('challan_details')
          .update({ total_bilty_count: newBiltyCount })
          .eq('id', selectedChallan.id);
        
        console.log(`📊 Updated challan bilty count to: ${newBiltyCount}`);
      }

      alert(`Successfully removed ${selectedTransitBilties.length} bilty(s) from challan`);
      
      // Clear selections and refresh data
      setSelectedTransitBilties([]);
      
      console.log('🔄 Refreshing data after bulk bilty removal...');
      await refreshData('bilties');      await refreshData('transit');
      await refreshData('challans');

    } catch (error) {
      console.error('Error removing bilty from transit:', error);
      alert('Error removing bilty from transit');
    } finally {
      setSaving(false);
    }
  };

  // PDF Preview Handlers
  const handlePreviewLoadingChallan = () => {
    if (bilties.length === 0) {
      alert('No available bilties to preview');
      return;
    }
    setPdfPreviewType('loading');
    setPdfPreviewOpen(true);
  };

  const handlePreviewChallanBilties = () => {
    if (!selectedChallan) {
      alert('Please select a challan first');
      return;
    }
    
    if (transitBilties.length === 0) {
      alert('No bilties in selected challan');
      return;
    }
    
    setPdfPreviewType('challan');
    setPdfPreviewOpen(true);
  };
  const closePdfPreview = () => {
    setPdfPreviewOpen(false);
    setPdfPreviewType(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-blue-200">
          <div className="text-2xl font-bold text-indigo-800 flex items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            Loading Transit Management...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-red-200 max-w-md w-full mx-4">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-800 mb-2">Error Loading Data</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={loadInitialData}
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 mx-auto"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Navbar />
      <div className="p-4 space-y-6">        {/* Header with PDF preview buttons */}        <TransitHeader 
          userBranch={userBranch}
          user={user}
          bilties={[...bilties, ...stationBilties]}
          transitBilties={transitBilties}
          selectedBilties={selectedBilties}
          selectedChallan={selectedChallan}
          totalAvailableCount={totalAvailableCount}
          availableCount={filteredAvailableCount}
          onRefresh={() => refreshData('all')}
          onPreviewLoadingChallan={handlePreviewLoadingChallan}
          onPreviewChallanBilties={handlePreviewChallanBilties}
          permanentDetails={permanentDetails}
        />{/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">          {/* Left Panel - Challan Selection - Smaller width */}
          <div className="lg:col-span-3 xl:col-span-3 space-y-4 lg:space-y-6">
            <ChallanSelector 
              challans={challans}
              challanBooks={challanBooks}
              selectedChallan={selectedChallan}
              setSelectedChallan={setSelectedChallan}
              selectedChallanBook={selectedChallanBook}
              setSelectedChallanBook={setSelectedChallanBook}
              onAddToTransit={() => handleAddBiltyToTransit(selectedBilties)}
              saving={saving}
              selectedBiltiesCount={selectedBilties.length}
              branches={branches}
              trucks={trucks}
              staff={staff}
              transitBilties={transitBilties}
            />
          </div>{/* Right Panel - Bilty Lists with Table Structure - Larger width */}
          <div className="lg:col-span-9 xl:col-span-9">            <BiltyList 
              bilties={bilties}
              stationBilties={stationBilties}
              transitBilties={transitBilties}
              selectedBilties={selectedBilties}
              setSelectedBilties={setSelectedBilties}
              selectedTransitBilties={selectedTransitBilties}
              setSelectedTransitBilties={setSelectedTransitBilties}
              selectedChallan={selectedChallan}
              onAddBiltyToTransit={handleAddBiltyToTransit}
              onRemoveBiltyFromTransit={handleRemoveBiltyFromTransit}
              onBulkRemoveFromTransit={handleBulkRemoveFromTransit}
              onRefresh={refreshData}
              saving={saving}
              totalAvailableCount={totalAvailableCount}
              onFilteredCountChange={setFilteredAvailableCount}
              cities={cities}
            />
          </div>
        </div>

        {/* Selected Bilties Summary */}
        <SelectedBiltiesSummary 
          selectedBilties={selectedBilties}
          onClearAll={() => setSelectedBilties([])}
        />

        {/* PDF Preview Modal */}        <ChallanPDFPreview
          isOpen={pdfPreviewOpen}
          onClose={closePdfPreview}
          type={pdfPreviewType}
          bilties={[...bilties, ...stationBilties]}
          transitBilties={transitBilties}
          selectedChallan={selectedChallan}
          selectedChallanBook={selectedChallanBook}
          userBranch={userBranch}
          permanentDetails={permanentDetails}
          branches={branches}
        />
      </div>
    </div>
  );
}