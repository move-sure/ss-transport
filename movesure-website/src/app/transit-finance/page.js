'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../utils/auth';
import supabase from '../utils/supabase';
import Navbar from '../../components/dashboard/navbar';
import FinanceChallanSelector from '../../components/transit-finance/finance-challan-selector';
import FinanceBiltyTable from '../../components/transit-finance/finance-bilty-table';
import KaatBillListModal from '../../components/transit-finance/kaat-bill-list-modal';
import { DollarSign, TrendingUp, FileText, Package, Clock, Sparkles, Loader2, AlertCircle, List, Plus, Receipt } from 'lucide-react';
import KaatListModal from '../../components/transit-finance/kaat-list-modal';
import AddKaatModal from '../../components/transit-finance/add-kaat-modal';

export default function TransitFinancePage() {
  const { user, requireAuth } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Data states
  const [challans, setChallans] = useState([]);
  const [transitDetails, setTransitDetails] = useState([]);
  const [cities, setCities] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedChallan, setSelectedChallan] = useState(null);
  const [showKaatList, setShowKaatList] = useState(false);
  const [showKaatModal, setShowKaatModal] = useState(false);
  
  // Pagination states
  const [challanBatchSize] = useState(200);
  const [transitBatchSize] = useState(2000);
  const [hasMoreChallans, setHasMoreChallans] = useState(true);
  const [hasMoreTransit, setHasMoreTransit] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Edit mode states
  const [editMode, setEditMode] = useState(false);
  const [editingBillId, setEditingBillId] = useState(null);
  const [editingBillGrNumbers, setEditingBillGrNumbers] = useState([]);
  const [kaatBillRefreshTrigger, setKaatBillRefreshTrigger] = useState(0);
  const [showKaatBillList, setShowKaatBillList] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && user) {
      loadAllFinanceData();
    }
  }, [mounted, user]);

  // Load transit details when challan is selected
  useEffect(() => {
    if (selectedChallan && selectedChallan.challan_no) {
      loadTransitDetailsForChallan(selectedChallan.challan_no);
    } else {
      setTransitDetails([]);
    }
  }, [selectedChallan]);

  const loadAllFinanceData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Loading initial finance data (50 challans)...');

      // Fetch cities, branches, and first 50 challans in parallel
      const [citiesRes, branchesRes, challansRes] = await Promise.all([
        supabase
          .from('cities')
          .select('*')
          .order('city_name'),
        supabase
          .from('branches')
          .select('*')
          .eq('is_active', true)
          .order('branch_name'),
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
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(50)
      ]);

      if (citiesRes.error) throw citiesRes.error;
      if (branchesRes.error) throw branchesRes.error;
      if (challansRes.error) throw challansRes.error;

      console.log('✅ Initial data loaded:', {
        challans: challansRes.data?.length || 0,
        cities: citiesRes.data?.length || 0,
        branches: branchesRes.data?.length || 0
      });

      setCities(citiesRes.data || []);
      setBranches(branchesRes.data || []);
      setChallans(challansRes.data || []);
      setHasMoreChallans((challansRes.data?.length || 0) >= 50);
      
      // Don't load transit details yet - wait for user to select a challan
      setTransitDetails([]);
      setHasMoreTransit(false);

    } catch (error) {
      console.error('❌ Error loading finance data:', error);
      setError(error.message || 'Failed to load finance data');
    } finally {
      setLoading(false);
    }
  };

  const loadTransitDetailsForChallan = async (challanNo) => {
    try {
      console.log(`🔄 Loading ALL transit details for challan: ${challanNo}...`);
      
      // Fetch ALL transit details for this challan in batches
      let allTransitDetails = [];
      let transitOffset = 0;
      const transitFetchSize = 1000;
      let hasMoreTransitToFetch = true;

      while (hasMoreTransitToFetch) {
        const { data: transitBatch, error: transitError } = await supabase
          .from('transit_details')
          .select(`
            id, challan_no, gr_no, bilty_id, from_branch_id, to_branch_id,
            is_out_of_delivery_from_branch1, is_delivered_at_branch2,
            is_delivered_at_destination, created_at
          `)
          .eq('challan_no', challanNo)
          .order('created_at', { ascending: false })
          .range(transitOffset, transitOffset + transitFetchSize - 1);

        if (transitError) throw transitError;

        if (transitBatch && transitBatch.length > 0) {
          allTransitDetails = [...allTransitDetails, ...transitBatch];
          console.log(`📊 Loaded ${transitBatch.length} transit records for challan ${challanNo} (Total: ${allTransitDetails.length})`);
          
          if (transitBatch.length < transitFetchSize) {
            hasMoreTransitToFetch = false;
          } else {
            transitOffset += transitFetchSize;
          }
        } else {
          hasMoreTransitToFetch = false;
        }
      }

      console.log(`✅ Total transit details loaded for challan ${challanNo}: ${allTransitDetails.length}`);

      // Now fetch bilty details for all transit records
      if (allTransitDetails.length > 0) {
        await loadBiltyDetailsForTransit(allTransitDetails, cities);
      } else {
        setTransitDetails([]);
      }

    } catch (error) {
      console.error('❌ Error loading transit details for challan:', error);
      throw error;
    }
  };

  const loadBiltyDetailsForTransit = async (transitData, citiesData) => {
    try {
      // Get unique GR numbers - keep original format for querying
      const grNumbers = [...new Set(
        transitData
          .map(t => t.gr_no)
          .filter(Boolean)
      )];
      
      console.log('🔍 Loading bilty details for', grNumbers.length, 'GR numbers...');
      console.log('📋 Sample GR numbers (original):', grNumbers.slice(0, 10));

      // Batch GR numbers to avoid query size limits (max 100 per batch)
      const batchSize = 100;
      const batches = [];
      for (let i = 0; i < grNumbers.length; i += batchSize) {
        batches.push(grNumbers.slice(i, i + batchSize));
      }

      let regularBiltiesData = [];
      let stationBiltiesData = [];

      // Fetch bilties in batches using .in() filter
      for (const batch of batches) {
        const [regularRes, stationRes] = await Promise.all([
          supabase
            .from('bilty')
            .select(`
              id, gr_no, bilty_date, consignor_name, consignee_name,
              payment_mode, no_of_pkg, total, to_city_id, wt, rate,
              freight_amount, created_at, contain, e_way_bill, pvt_marks,
              consignor_gst, consignor_number, consignee_gst, consignee_number,
              transport_name, transport_gst, transport_number, delivery_type,
              invoice_no, invoice_value, invoice_date, document_number,
              labour_charge, bill_charge, toll_charge, dd_charge, other_charge, remark,
              branch_id, saving_option, is_active
            `)
            .in('gr_no', batch)
            .eq('is_active', true),

          supabase
            .from('station_bilty_summary')
            .select(`
              id, station, gr_no, consignor, consignee, contents,
              no_of_packets, weight, payment_status, amount, pvt_marks,
              e_way_bill, created_at, updated_at
            `)
            .in('gr_no', batch)
        ]);

        regularBiltiesData = [...regularBiltiesData, ...(regularRes.data || [])];
        stationBiltiesData = [...stationBiltiesData, ...(stationRes.data || [])];
      }

      const regularBiltiesRes = { data: regularBiltiesData, error: null };
      const stationBiltiesRes = { data: stationBiltiesData, error: null };

      console.log('📊 Bilty fetch results (ALL active records):', {
        totalRegularBilties: regularBiltiesRes.data?.length || 0,
        totalStationBilties: stationBiltiesRes.data?.length || 0,
        regularError: regularBiltiesRes.error,
        stationError: stationBiltiesRes.error
      });

      // Create normalized GR number set for matching
      const normalizedGrNumbers = new Set(
        grNumbers.map(gr => gr?.toString().trim().toUpperCase())
      );

      // Filter and create maps - only include bilties with matching GR numbers
      const biltyMap = {};
      const stationBiltyMap = {};

      (regularBiltiesRes.data || []).forEach(bilty => {
        const normalizedGrNo = bilty.gr_no?.toString().trim().toUpperCase();
        if (normalizedGrNo && normalizedGrNumbers.has(normalizedGrNo)) {
          biltyMap[normalizedGrNo] = bilty;
        }
      });

      (stationBiltiesRes.data || []).forEach(station => {
        const normalizedGrNo = station.gr_no?.toString().trim().toUpperCase();
        if (normalizedGrNo && normalizedGrNumbers.has(normalizedGrNo)) {
          stationBiltyMap[normalizedGrNo] = station;
        }
      });

      console.log('🗺️ Sample GR numbers we\'re looking for:', grNumbers.slice(0, 5));
      console.log('🔍 Regular bilties matched:', Object.keys(biltyMap).length, '- Sample:', Object.keys(biltyMap).slice(0, 5));
      console.log('🔍 Station bilties matched:', Object.keys(stationBiltyMap).length, '- Sample:', Object.keys(stationBiltyMap).slice(0, 5));

      // Combine transit data with bilty details - normalize GR numbers for matching
      const enrichedTransitDetails = transitData.map(transit => {
        const normalizedGrNo = transit.gr_no?.toString().trim().toUpperCase();
        const bilty = biltyMap[normalizedGrNo];
        const station = stationBiltyMap[normalizedGrNo];
        
        return {
          ...transit,
          bilty: bilty || null,
          station: station || null
        };
      });

      console.log('✅ Enriched transit details:', enrichedTransitDetails.length);
      console.log('📊 Sample enriched transit:', enrichedTransitDetails[0]);
      console.log('📋 Total bilties found:', Object.keys(biltyMap).length);
      console.log('🏪 Total station bilties found:', Object.keys(stationBiltyMap).length);
      
      // Count how many transits have bilty data
      const transitsWithBilty = enrichedTransitDetails.filter(t => t.bilty !== null).length;
      const transitsWithStation = enrichedTransitDetails.filter(t => t.station !== null).length;
      const transitsWithNoData = enrichedTransitDetails.filter(t => t.bilty === null && t.station === null).length;
      
      console.log('📈 Data enrichment stats:', {
        withBilty: transitsWithBilty,
        withStation: transitsWithStation,
        withNoData: transitsWithNoData,
        total: enrichedTransitDetails.length
      });
      
      setTransitDetails(enrichedTransitDetails);

    } catch (error) {
      console.error('❌ Error loading bilty details:', error);
      throw error;
    }
  };

  const loadMoreChallans = async () => {
    if (!hasMoreChallans || loadingMore) return;

    try {
      setLoadingMore(true);
      console.log('🔄 Loading more challans... Current count:', challans.length);

      // Fetch next batch using offset
      const { data: moreChallans, error } = await supabase
        .from('challan_details')
        .select(`
          id, challan_no, branch_id, truck_id, owner_id, driver_id, date,
          total_bilty_count, remarks, is_active, is_dispatched, dispatch_date,
          created_by, created_at, updated_at,
          truck:trucks(id, truck_number, truck_type),
          owner:staff!challan_details_owner_id_fkey(id, name, mobile_number),
          driver:staff!challan_details_driver_id_fkey(id, name, mobile_number, license_number)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .range(challans.length, challans.length + challanBatchSize - 1);

      if (error) throw error;

      if (moreChallans && moreChallans.length > 0) {
        setChallans(prev => [...prev, ...moreChallans]);
        setHasMoreChallans(moreChallans.length >= challanBatchSize);
        console.log('✅ Loaded', moreChallans.length, 'more challans');
      } else {
        setHasMoreChallans(false);
        console.log('✅ No more challans to load');
      }

    } catch (error) {
      console.error('❌ Error loading more challans:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const loadMoreTransitDetails = async () => {
    if (!hasMoreTransit || loadingMore) return;

    try {
      setLoadingMore(true);
      console.log('🔄 Loading more transit details... Current count:', transitDetails.length);

      // Fetch next batch using offset
      const { data: moreTransit, error } = await supabase
        .from('transit_details')
        .select(`
          id, challan_no, gr_no, bilty_id, from_branch_id, to_branch_id,
          is_out_of_delivery_from_branch1, is_delivered_at_branch2,
          is_delivered_at_destination, created_at
        `)
        .order('created_at', { ascending: false })
        .range(transitDetails.length, transitDetails.length + transitBatchSize - 1);

      if (error) throw error;

      if (moreTransit && moreTransit.length > 0) {
        // Load bilty details for new transit records
        await loadBiltyDetailsForTransit(moreTransit, cities);
        setHasMoreTransit(moreTransit.length >= transitBatchSize);
        console.log('✅ Loaded', moreTransit.length, 'more transit details');
      } else {
        setHasMoreTransit(false);
        console.log('✅ No more transit details to load');
      }

    } catch (error) {
      console.error('❌ Error loading more transit details:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="bg-white rounded-2xl shadow-2xl p-8 border border-blue-200">
            <div className="text-2xl font-bold text-indigo-800 flex items-center gap-3">
              <Loader2 className="animate-spin h-8 w-8 text-indigo-600" />
              Loading Transit Finance Data...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <Navbar />
        <div className="container mx-auto px-6 py-16">
          <div className="bg-white rounded-2xl shadow-2xl p-8 border border-red-200 max-w-md mx-auto">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-red-800 mb-2">Error Loading Data</h2>
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={loadAllFinanceData}
                className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <Navbar />
      
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-blue-600" />
              Transit Finance Dashboard
            </h1>
            <p className="text-gray-600 mt-2">
              View all challans and bilty details across all branches for financial analysis
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowKaatModal(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-5 py-3 rounded-lg font-semibold hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Kaat
            </button>
            <button
              onClick={() => setShowKaatList(true)}
              className="bg-gradient-to-r from-green-600 to-teal-600 text-white px-5 py-3 rounded-lg font-semibold hover:shadow-lg transition-all flex items-center gap-2"
            >
              <List className="w-5 h-5" />
             Kaat Rate List
            </button>
          </div>
        </div>

        {/* Challan Selector - Full Width at Top */}
        <div className="mb-4">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <FinanceChallanSelector
                challans={challans}
                selectedChallan={selectedChallan}
                setSelectedChallan={setSelectedChallan}
                branches={branches}
                transitDetails={transitDetails}
                hasMoreChallans={hasMoreChallans}
                loadingMore={loadingMore}
                onLoadMore={loadMoreChallans}
              />
            </div>
            {selectedChallan && (
              <div className="flex-shrink-0">
                <button
                  onClick={() => setShowKaatBillList(true)}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-3 rounded-lg font-semibold hover:shadow-lg transition-all flex items-center gap-2 h-full"
                  title="View saved kaat bills for this challan"
                >
                  <Receipt className="w-5 h-5" />
                  View Kaat Bills
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bilty Table - Full Width */}
        <div>
          <FinanceBiltyTable
            transitDetails={transitDetails}
            selectedChallan={selectedChallan}
            cities={cities}
            editMode={editMode}
            editingBillId={editingBillId}
            editingBillGrNumbers={editingBillGrNumbers}
            onKaatBillSaved={() => {
              setEditMode(false);
              setEditingBillId(null);
              setEditingBillGrNumbers([]);
              setKaatBillRefreshTrigger(prev => prev + 1);
            }}
            onCancelEdit={() => {
              setEditMode(false);
              setEditingBillId(null);
              setEditingBillGrNumbers([]);
            }}
            onViewKaatBills={() => setShowKaatBillList(true)}
          />
        </div>
      </div>

      {/* Add Kaat Modal */}
      <AddKaatModal
        isOpen={showKaatModal}
        onClose={() => setShowKaatModal(false)}
        cities={cities}
        onSuccess={(data) => {
          console.log('✅ Kaat rate added:', data);
          setShowKaatModal(false);
        }}
      />

      {/* Kaat List Modal */}
      <KaatListModal
        isOpen={showKaatList}
        onClose={() => setShowKaatList(false)}
        cities={cities}
      />

      {/* Kaat Bill List Modal */}
      {selectedChallan && (
        <KaatBillListModal
          isOpen={showKaatBillList}
          onClose={() => setShowKaatBillList(false)}
          selectedChallan={selectedChallan}
          onEditKaatBill={(bill) => {
            setEditMode(true);
            setEditingBillId(bill.id);
            setEditingBillGrNumbers(bill.gr_numbers || []);
            setShowKaatBillList(false);
            // Scroll to top to show bilty table
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}
    </div>
  );
}
