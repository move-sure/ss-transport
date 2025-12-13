'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, DollarSign, Truck, Calendar, User, MapPin, Package, 
  Loader2, AlertCircle, Plus, List, Receipt, RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import Navbar from '../../../components/dashboard/navbar';
import FinanceBiltyTable from '../../../components/transit-finance/finance-bilty-table';
import AddKaatModal from '../../../components/transit-finance/add-kaat-modal';
import KaatListModal from '../../../components/transit-finance/kaat-list-modal';
import KaatBillListModal from '../../../components/transit-finance/kaat-bill-list-modal';
import supabase from '../../utils/supabase';
import { useAuth } from '../../utils/auth';

export default function ChallanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const challanNo = params.challan_no;
  const { user } = useAuth();
  
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Data states
  const [challan, setChallan] = useState(null);
  const [transitDetails, setTransitDetails] = useState([]);
  const [cities, setCities] = useState([]);
  const [branches, setBranches] = useState([]);
  
  // Modal states
  const [showKaatList, setShowKaatList] = useState(false);
  const [showKaatModal, setShowKaatModal] = useState(false);
  const [showKaatBillList, setShowKaatBillList] = useState(false);
  
  // Edit mode states
  const [editMode, setEditMode] = useState(false);
  const [editingBillId, setEditingBillId] = useState(null);
  const [editingBillGrNumbers, setEditingBillGrNumbers] = useState([]);
  const [kaatBillRefreshTrigger, setKaatBillRefreshTrigger] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && user && challanNo) {
      loadChallanData();
    }
  }, [mounted, user, challanNo]);

  const loadChallanData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log(`🔄 Loading data for challan: ${challanNo}...`);

      // Fetch challan details, cities, and branches in parallel
      const [challanRes, citiesRes, branchesRes] = await Promise.all([
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
          .eq('challan_no', challanNo)
          .single(),
        supabase
          .from('cities')
          .select('*')
          .order('city_name'),
        supabase
          .from('branches')
          .select('*')
          .eq('is_active', true)
          .order('branch_name')
      ]);

      if (challanRes.error) {
        if (challanRes.error.code === 'PGRST116') {
          throw new Error('Challan not found');
        }
        throw challanRes.error;
      }
      if (citiesRes.error) throw citiesRes.error;
      if (branchesRes.error) throw branchesRes.error;

      console.log('✅ Challan data loaded:', challanRes.data);

      setChallan(challanRes.data);
      setCities(citiesRes.data || []);
      setBranches(branchesRes.data || []);

      // Now load transit details for this challan
      await loadTransitDetailsForChallan(challanNo, citiesRes.data);

    } catch (error) {
      console.error('❌ Error loading challan data:', error);
      setError(error.message || 'Failed to load challan data');
    } finally {
      setLoading(false);
    }
  };

  const loadTransitDetailsForChallan = async (challanNo, citiesData) => {
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
          console.log(`📊 Loaded ${transitBatch.length} transit records (Total: ${allTransitDetails.length})`);
          
          if (transitBatch.length < transitFetchSize) {
            hasMoreTransitToFetch = false;
          } else {
            transitOffset += transitFetchSize;
          }
        } else {
          hasMoreTransitToFetch = false;
        }
      }

      console.log(`✅ Total transit details loaded: ${allTransitDetails.length}`);

      // Now fetch bilty details for all transit records
      if (allTransitDetails.length > 0) {
        await loadBiltyDetailsForTransit(allTransitDetails, citiesData);
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

      console.log('📊 Bilty fetch results:', {
        totalRegularBilties: regularBiltiesData.length,
        totalStationBilties: stationBiltiesData.length
      });

      // Create normalized GR number set for matching
      const normalizedGrNumbers = new Set(
        grNumbers.map(gr => gr?.toString().trim().toUpperCase())
      );

      // Filter and create maps - only include bilties with matching GR numbers
      const biltyMap = {};
      const stationBiltyMap = {};

      regularBiltiesData.forEach(bilty => {
        const normalizedGrNo = bilty.gr_no?.toString().trim().toUpperCase();
        if (normalizedGrNo && normalizedGrNumbers.has(normalizedGrNo)) {
          biltyMap[normalizedGrNo] = bilty;
        }
      });

      stationBiltiesData.forEach(station => {
        const normalizedGrNo = station.gr_no?.toString().trim().toUpperCase();
        if (normalizedGrNo && normalizedGrNumbers.has(normalizedGrNo)) {
          stationBiltyMap[normalizedGrNo] = station;
        }
      });

      // Combine transit data with bilty details
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
      
      setTransitDetails(enrichedTransitDetails);

    } catch (error) {
      console.error('❌ Error loading bilty details:', error);
      throw error;
    }
  };

  const getBranchName = (branchId) => {
    const branch = branches?.find(b => b.id === branchId);
    return branch?.branch_name || 'Unknown';
  };

  const handleRefresh = () => {
    loadChallanData();
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
              Loading Challan {challanNo}...
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
              <h2 className="text-xl font-bold text-red-800 mb-2">Error Loading Challan</h2>
              <p className="text-red-600 mb-4">{error}</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => router.push('/transit-finance')}
                  className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Back to List
                </button>
                <button
                  onClick={handleRefresh}
                  className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Retry
                </button>
              </div>
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
        {/* Back Button & Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/transit-finance')}
            className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Challan List</span>
          </button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-blue-600" />
                Challan: {challan?.challan_no}
              </h1>
              <p className="text-gray-600 mt-2">
                View bilty details and manage kaat for this challan
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                className="bg-gray-100 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-200 transition-all flex items-center gap-2"
                title="Refresh data"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
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
              <button
                onClick={() => setShowKaatBillList(true)}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-3 rounded-lg font-semibold hover:shadow-lg transition-all flex items-center gap-2"
                title="View saved kaat bills for this challan"
              >
                <Receipt className="w-5 h-5" />
                View Kaat Bills
              </button>
            </div>
          </div>
        </div>

        {/* Challan Info Card */}
        {challan && (
          <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
            <div className="flex items-center justify-between gap-6 flex-wrap">
              {/* Challan Number */}
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="text-xs text-gray-600 font-medium">Challan</div>
                  <div className="text-lg font-bold text-blue-900">{challan.challan_no}</div>
                </div>
              </div>

              <div className="h-10 w-px bg-gray-300"></div>

              {/* Status */}
              <div>
                <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
                  challan.is_dispatched 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {challan.is_dispatched ? 'Dispatched' : 'Active'}
                </span>
              </div>

              <div className="h-10 w-px bg-gray-300"></div>

              {/* Branch */}
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <div>
                  <div className="text-xs text-gray-600">Branch</div>
                  <div className="text-sm font-semibold text-gray-900">{getBranchName(challan.branch_id)}</div>
                </div>
              </div>

              <div className="h-10 w-px bg-gray-300"></div>

              {/* Vehicle */}
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-green-600" />
                <div>
                  <div className="text-xs text-gray-600">Vehicle</div>
                  <div className="text-sm font-semibold text-gray-900">{challan.truck?.truck_number || 'N/A'}</div>
                </div>
              </div>

              <div className="h-10 w-px bg-gray-300"></div>

              {/* Driver */}
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-orange-600" />
                <div>
                  <div className="text-xs text-gray-600">Driver</div>
                  <div className="text-sm font-semibold text-gray-900">{challan.driver?.name || 'N/A'}</div>
                </div>
              </div>

              <div className="h-10 w-px bg-gray-300"></div>

              {/* Date */}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-600" />
                <div>
                  <div className="text-xs text-gray-600">Date</div>
                  <div className="text-sm font-semibold text-gray-900">
                    {challan.date ? format(new Date(challan.date), 'dd MMM yyyy') : 'N/A'}
                  </div>
                </div>
              </div>

              <div className="h-10 w-px bg-gray-300"></div>

              {/* Bilty Count */}
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-purple-600" />
                <div>
                  <div className="text-xs text-gray-600">Total Bilties</div>
                  <div className="text-sm font-semibold text-gray-900">{transitDetails.length}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bilty Table - Full Width */}
        <div>
          <FinanceBiltyTable
            transitDetails={transitDetails}
            selectedChallan={challan}
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
      {challan && (
        <KaatBillListModal
          isOpen={showKaatBillList}
          onClose={() => setShowKaatBillList(false)}
          selectedChallan={challan}
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
