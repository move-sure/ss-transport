'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import Navbar from '../../../components/dashboard/navbar';
import { ChallanPageHeader, ChallanInfoCard, ChallanBiltyTable } from '../../../components/transit-finance/challan-wise';
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

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted && user && challanNo) loadChallanData();
  }, [mounted, user, challanNo]);

  const loadChallanData = async () => {
    try {
      setLoading(true);
      setError(null);

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
        supabase.from('cities').select('*').order('city_name'),
        supabase.from('branches').select('*').eq('is_active', true).order('branch_name'),
      ]);

      if (challanRes.error) {
        if (challanRes.error.code === 'PGRST116') throw new Error('Challan not found');
        throw challanRes.error;
      }
      if (citiesRes.error) throw citiesRes.error;
      if (branchesRes.error) throw branchesRes.error;

      setChallan(challanRes.data);
      setCities(citiesRes.data || []);
      setBranches(branchesRes.data || []);

      await loadTransitDetailsForChallan(challanNo, citiesRes.data);
    } catch (err) {
      console.error('Error loading challan data:', err);
      setError(err.message || 'Failed to load challan data');
    } finally {
      setLoading(false);
    }
  };

  const loadTransitDetailsForChallan = async (challanNo, citiesData) => {
    let allTransitDetails = [];
    let offset = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: batch, error } = await supabase
        .from('transit_details')
        .select(`
          id, challan_no, gr_no, bilty_id, from_branch_id, to_branch_id,
          is_out_of_delivery_from_branch1, is_delivered_at_branch2,
          is_delivered_at_destination, created_at
        `)
        .eq('challan_no', challanNo)
        .order('created_at', { ascending: false })
        .range(offset, offset + batchSize - 1);

      if (error) throw error;
      if (batch?.length > 0) {
        allTransitDetails = [...allTransitDetails, ...batch];
        hasMore = batch.length >= batchSize;
        offset += batchSize;
      } else {
        hasMore = false;
      }
    }

    if (allTransitDetails.length > 0) {
      await loadBiltyDetailsForTransit(allTransitDetails, citiesData);
    } else {
      setTransitDetails([]);
    }
  };

  const loadBiltyDetailsForTransit = async (transitData, citiesData) => {
    const grNumbers = [...new Set(transitData.map(t => t.gr_no).filter(Boolean))];
    const batchSize = 100;
    const batches = [];
    for (let i = 0; i < grNumbers.length; i += batchSize) batches.push(grNumbers.slice(i, i + batchSize));

    let regularBiltiesData = [];
    let stationBiltiesData = [];

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
            e_way_bill, delivery_type, created_at, updated_at
          `)
          .in('gr_no', batch),
      ]);
      regularBiltiesData = [...regularBiltiesData, ...(regularRes.data || [])];
      stationBiltiesData = [...stationBiltiesData, ...(stationRes.data || [])];
    }

    const normalizedGrNumbers = new Set(grNumbers.map(gr => gr?.toString().trim().toUpperCase()));
    const biltyMap = {};
    const stationBiltyMap = {};

    regularBiltiesData.forEach(bilty => {
      const n = bilty.gr_no?.toString().trim().toUpperCase();
      if (n && normalizedGrNumbers.has(n)) biltyMap[n] = bilty;
    });
    stationBiltiesData.forEach(station => {
      const n = station.gr_no?.toString().trim().toUpperCase();
      if (n && normalizedGrNumbers.has(n)) stationBiltyMap[n] = station;
    });

    const enriched = transitData.map(transit => {
      const n = transit.gr_no?.toString().trim().toUpperCase();
      return { ...transit, bilty: biltyMap[n] || null, station: stationBiltyMap[n] || null };
    });

    setTransitDetails(enriched);
  };

  const getBranchName = (branchId) => {
    const branch = branches?.find(b => b.id === branchId);
    return branch?.branch_name || 'Unknown';
  };

  // ========== LOADING STATE ==========
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="flex items-center gap-3">
              <Loader2 className="animate-spin h-7 w-7 text-blue-600" />
              <span className="text-xl font-bold text-gray-800">Loading Challan {challanNo}...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-red-100 max-w-sm text-center">
            <AlertCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-red-800 mb-2">Error Loading Challan</h2>
            <p className="text-red-600 text-sm mb-5">{error}</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => router.push('/transit-finance')} className="bg-gray-100 text-gray-700 px-5 py-2 rounded-lg hover:bg-gray-200 font-medium text-sm">
                Back
              </button>
              <button onClick={loadChallanData} className="bg-red-600 text-white px-5 py-2 rounded-lg hover:bg-red-700 font-medium text-sm">
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ========== MAIN LAYOUT (Full Width) ==========
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      {/* Full-width content with minimal padding */}
      <div className="flex-1 flex flex-col px-3 py-3 max-w-full">
        {/* Page Header */}
        <ChallanPageHeader
          challanNo={challan?.challan_no}
          onBack={() => router.push('/transit-finance')}
          onRefresh={loadChallanData}
          onAddKaat={() => setShowKaatModal(true)}
          onShowKaatList={() => setShowKaatList(true)}
          onShowKaatBills={() => setShowKaatBillList(true)}
        />

        {/* Challan Info Card */}
        <ChallanInfoCard
          challan={challan}
          branchName={getBranchName(challan?.branch_id)}
          biltyCount={transitDetails.length}
        />

        {/* Bilty Table - Full Width, Takes Remaining Space */}
        <div className="flex-1 min-h-0">
          <ChallanBiltyTable
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

      {/* Modals */}
      <AddKaatModal
        isOpen={showKaatModal}
        onClose={() => setShowKaatModal(false)}
        cities={cities}
        onSuccess={(data) => { setShowKaatModal(false); }}
      />

      <KaatListModal
        isOpen={showKaatList}
        onClose={() => setShowKaatList(false)}
        cities={cities}
      />

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
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}
    </div>
  );
}
