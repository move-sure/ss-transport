'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../utils/auth';
import supabase from '../utils/supabase';
import { format } from 'date-fns';
import { AlertCircle, RefreshCw } from 'lucide-react';

// Import components
import TransitHeader from '../../components/transit/TransitHeader';
import ChallanSelector from '../../components/transit/ChallanSelector';
import BiltyList from '../../components/transit/BiltyList';
import SelectedBiltiesSummary from '../../components/transit/SelectedBiltiesSummary';
import ChallanPDFPreview from '../../components/transit/ChallanPDFPreview';
import { generateLoadingChallanPDF, generateChallanBiltiesPDF } from '../../components/transit/PDFGenerator';

export default function TransitManagement() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
  // Data states
  const [bilties, setBilties] = useState([]);
  const [transitBilties, setTransitBilties] = useState([]);
  const [challans, setChallans] = useState([]);
  const [challanBooks, setChallanBooks] = useState([]);
  const [cities, setCities] = useState([]);
  const [userBranch, setUserBranch] = useState(null);
  const [trucks, setTrucks] = useState([]);
  const [staff, setStaff] = useState([]);
  const [branches, setBranches] = useState([]);
  const [permanentDetails, setPermanentDetails] = useState(null);
  
  // Selection states
  const [selectedChallan, setSelectedChallan] = useState(null);
  const [selectedChallanBook, setSelectedChallanBook] = useState(null);
  const [selectedBilties, setSelectedBilties] = useState([]);

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
      
      // Load all required data in parallel
      const [
        userBranchRes,
        citiesRes,
        biltiesRes,
        challansRes,
        challanBooksRes,
        trucksRes,
        staffRes,
        transitRes,
        branchesRes,
        permanentDetailsRes
      ] = await Promise.all([
        // User branch details
        supabase
          .from('branches')
          .select('*')
          .eq('id', user.branch_id)
          .single(),
        
        // Cities
        supabase
          .from('cities')
          .select('*')
          .order('city_name'),
        
        // Bilties that are not yet in transit - FETCH ALL REQUIRED FIELDS
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
          .eq('branch_id', user.branch_id)
          .eq('is_active', true)
          .eq('saving_option', 'SAVE')
          .order('created_at', { ascending: false })
          .limit(100),
        
        // Challans with truck, driver, owner details
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
        
        // Challan books
        supabase
          .from('challan_books')
          .select('*')
          .eq('from_branch_id', user.branch_id)
          .eq('is_active', true)
          .eq('is_completed', false)
          .order('created_at', { ascending: false }),
        
        // Trucks
        supabase
          .from('trucks')
          .select('*')
          .eq('is_active', true)
          .order('truck_number'),
        
        // Staff
        supabase
          .from('staff')
          .select('*')
          .eq('is_active', true)
          .order('name'),
        
        // Transit bilties to filter out
        supabase
          .from('transit_details')
          .select('bilty_id')
          .eq('from_branch_id', user.branch_id)
          .eq('is_active', true),

        // All branches for destination display
        supabase
          .from('branches')
          .select('*')
          .eq('is_active', true)
          .order('branch_name'),

        // Permanent details for company info in PDFs
        supabase
          .from('permanent_details')
          .select('*')
          .eq('branch_id', user.branch_id)
          .single()
      ]);

      // Handle errors
      if (userBranchRes.error) throw new Error(`Branch error: ${userBranchRes.error.message}`);
      if (citiesRes.error) throw new Error(`Cities error: ${citiesRes.error.message}`);
      if (biltiesRes.error) throw new Error(`Bilties error: ${biltiesRes.error.message}`);
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
      
      console.log('Challans with details loaded:', challansRes.data?.length);
      console.log('Permanent details loaded:', permanentDetailsRes.data);      // Filter out bilties that are already in transit
      const transitBiltyIds = new Set(transitRes.data?.map(t => t.bilty_id) || []);
      const processedBilties = (biltiesRes.data || [])
        .filter(b => !transitBiltyIds.has(b.id))
        .map(bilty => {
          const city = citiesRes.data?.find(c => c.id === bilty.to_city_id);
          return {
            ...bilty,
            to_city_name: city?.city_name || 'Unknown',
            to_city_code: city?.city_code || 'N/A'
          };
        })
        .sort(sortByGRNumber); // Sort by GR number

      setBilties(processedBilties);
      
      // Auto-select the most recent active challan
      const activeChallans = (challansRes.data || []).filter(c => !c.is_dispatched);
      if (activeChallans.length > 0) {
        const recentChallan = activeChallans[0];
        setSelectedChallan(recentChallan);
        console.log('Auto-selected recent challan:', recentChallan.challan_no);
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

  const loadTransitBilties = async (challanNo) => {
    try {
      console.log('Loading transit bilties for challan:', challanNo);
      
      const { data: transitData, error } = await supabase
        .from('transit_details')
        .select(`
          id, challan_no, gr_no, bilty_id, from_branch_id, to_branch_id,
          is_out_of_delivery_from_branch1, is_delivered_at_branch2,
          is_delivered_at_destination,
          bilty:bilty(
            id, gr_no, bilty_date, consignor_name, consignee_name,
            payment_mode, no_of_pkg, total, to_city_id, wt, rate,
            freight_amount, created_at, contain, e_way_bill, pvt_marks,
            consignor_gst, consignor_number, consignee_gst, consignee_number,
            transport_name, transport_gst, transport_number, delivery_type,
            invoice_no, invoice_value, invoice_date, document_number,
            labour_charge, bill_charge, toll_charge, dd_charge, other_charge, remark
          )
        `)
        .eq('challan_no', challanNo)
        .eq('from_branch_id', user.branch_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading transit bilties:', error);
        setTransitBilties([]);
        return;
      }      // Process transit bilties with city names
      const processedTransitBilties = (transitData || []).map(transit => {
        const bilty = transit.bilty;
        const city = cities.find(c => c.id === bilty?.to_city_id);
        return {
          ...bilty,
          transit_id: transit.id,
          challan_no: transit.challan_no,
          to_city_name: city?.city_name || 'Unknown',
          to_city_code: city?.city_code || 'N/A',
          in_transit: true,
          is_out_of_delivery_from_branch1: transit.is_out_of_delivery_from_branch1,
          is_delivered_at_branch2: transit.is_delivered_at_branch2,
          is_delivered_at_destination: transit.is_delivered_at_destination
        };
      }).sort(sortByGRNumber); // Sort by GR number

      setTransitBilties(processedTransitBilties);
      console.log('Transit bilties loaded:', processedTransitBilties.length);
      
    } catch (error) {
      console.error('Error loading transit bilties:', error);
      setTransitBilties([]);
    }
  };

  // Efficient refresh function
  const refreshData = useCallback(async (refreshType = 'all') => {
    try {
      console.log('Refreshing data:', refreshType);
      
      if (refreshType === 'all' || refreshType === 'bilties') {
        // Refresh available bilties
        const { data: transitRes } = await supabase
          .from('transit_details')
          .select('bilty_id')
          .eq('from_branch_id', user.branch_id)
          .eq('is_active', true);

        const { data: biltiesRes } = await supabase
          .from('bilty')
          .select(`
            id, gr_no, bilty_date, consignor_name, consignee_name,
            payment_mode, no_of_pkg, total, to_city_id, wt, rate,
            freight_amount, branch_id, saving_option, created_at
          `)
          .eq('branch_id', user.branch_id)
          .eq('is_active', true)
          .eq('saving_option', 'SAVE')
          .order('created_at', { ascending: false })
          .limit(100);        const transitBiltyIds = new Set(transitRes?.map(t => t.bilty_id) || []);
        const processedBilties = (biltiesRes || [])
          .filter(b => !transitBiltyIds.has(b.id))
          .map(bilty => {
            const city = cities.find(c => c.id === bilty.to_city_id);
            return {
              ...bilty,
              to_city_name: city?.city_name || 'Unknown',
              to_city_code: city?.city_code || 'N/A'
            };
          })
          .sort(sortByGRNumber); // Sort by GR number

        setBilties(processedBilties);
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

      console.log('Data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  }, [user.branch_id, cities, selectedChallan]);

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

      // Prepare transit details data
      const transitData = biltiesArray.map(bilty => ({
        challan_no: selectedChallan.challan_no,
        gr_no: bilty.gr_no,
        bilty_id: bilty.id,
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
        updated_by: null,
        is_active: true
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

      // Update challan bilty count only
      const newBiltyCount = selectedChallan.total_bilty_count + biltiesArray.length;
      await supabase
        .from('challan_details')
        .update({ total_bilty_count: newBiltyCount })
        .eq('id', selectedChallan.id);

      // Note: We don't update challan book current number here
      // Challan book is only for creating new challans, not for managing bilties

      alert(`Successfully added ${biltiesArray.length} bilty(s) to challan ${selectedChallan.challan_no}`);
      
      // Clear selections and refresh data
      setSelectedBilties([]);
      await refreshData('bilties');
      await refreshData('transit');
      await refreshData('challans');

    } catch (error) {
      console.error('Error adding to transit:', error);
      alert('Error adding bilties to transit. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveBiltyFromTransit = async (bilty) => {
    if (!bilty.transit_id) return;

    if (selectedChallan?.is_dispatched) {
      alert('Cannot remove bilties from a dispatched challan');
      return;
    }

    try {
      const confirmRemove = window.confirm(`Remove ${bilty.gr_no} from challan ${bilty.challan_no}?`);
      if (!confirmRemove) return;

      setSaving(true);

      // Remove from transit_details
      const { error } = await supabase
        .from('transit_details')
        .update({ is_active: false })
        .eq('id', bilty.transit_id);

      if (error) {
        console.error('Error removing bilty from transit:', error);
        alert('Error removing bilty from transit');
        return;
      }

      // Update challan bilty count
      if (selectedChallan) {
        const newBiltyCount = Math.max(0, selectedChallan.total_bilty_count - 1);
        await supabase
          .from('challan_details')
          .update({ total_bilty_count: newBiltyCount })
          .eq('id', selectedChallan.id);
      }

      alert(`Successfully removed ${bilty.gr_no} from challan`);
      
      // Refresh data efficiently
      await refreshData('bilties');
      await refreshData('transit');
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

  // Legacy PDF Download Handlers (keeping for backward compatibility)
  const handleDownloadLoadingChallan = async () => {
    try {
      if (bilties.length === 0) {
        alert('No available bilties to download');
        return;
      }
      
      console.log('Generating Loading Challan PDF...');
      await generateLoadingChallanPDF(bilties, userBranch, permanentDetails);
    } catch (error) {
      console.error('Error generating Loading Challan PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  const handleDownloadChallanBilties = async () => {
    try {
      if (!selectedChallan) {
        alert('Please select a challan first');
        return;
      }
      
      if (transitBilties.length === 0) {
        alert('No bilties in selected challan');
        return;
      }
      
      console.log('Generating Challan Bilties PDF...');
      await generateChallanBiltiesPDF(transitBilties, selectedChallan, userBranch, permanentDetails);
    } catch (error) {
      console.error('Error generating Challan Bilties PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
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
      <div className="p-4 space-y-6">
        {/* Header with PDF preview buttons */}
        <TransitHeader 
          userBranch={userBranch}
          user={user}
          bilties={bilties}
          transitBilties={transitBilties}
          selectedBilties={selectedBilties}
          selectedChallan={selectedChallan}
          onRefresh={() => refreshData('all')}
          onPreviewLoadingChallan={handlePreviewLoadingChallan}
          onPreviewChallanBilties={handlePreviewChallanBilties}
        />

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left Panel - Challan Selection */}
          <div className="xl:col-span-4 space-y-6">
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
            />
          </div>

          {/* Right Panel - Bilty Lists with Table Structure */}
          <div className="xl:col-span-8">
            <BiltyList 
              bilties={bilties}
              transitBilties={transitBilties}
              selectedBilties={selectedBilties}
              setSelectedBilties={setSelectedBilties}
              selectedChallan={selectedChallan}
              onAddBiltyToTransit={handleAddBiltyToTransit}
              onRemoveBiltyFromTransit={handleRemoveBiltyFromTransit}
            />
          </div>
        </div>

        {/* Selected Bilties Summary */}
        <SelectedBiltiesSummary 
          selectedBilties={selectedBilties}
          onClearAll={() => setSelectedBilties([])}
        />

        {/* PDF Preview Modal */}
        <ChallanPDFPreview
          isOpen={pdfPreviewOpen}
          onClose={closePdfPreview}
          type={pdfPreviewType}
          bilties={bilties}
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