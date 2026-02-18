'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../utils/auth';
import supabase from '../../utils/supabase';
import Navbar from '../../../components/dashboard/navbar';
import KaatBillSelector from '../../../components/transit-finance/kaat-bill/kaat-bill-selector';
import ConsolidatedPDFPreview from '../../../components/transit-finance/kaat-bill/consolidated-pdf-preview';
import ConsolidatedSettingsModal from '../../../components/transit-finance/kaat-bill/consolidated-settings-modal';
import { generateConsolidatedKaatPDF } from '../../../components/transit-finance/kaat-bill/consolidated-pdf-generator';
import {
  calculateTotalKaatAmount,
  saveKaatBillToDatabase,
  getCurrentUser
} from '../../../components/transit-finance/kaat-bill-service';
import { 
  FileText, 
  Loader2, 
  AlertCircle, 
  ArrowLeft, 
  Printer, 
  RefreshCw,
  Calendar,
  Filter,
  Search,
  Building2,
  Layers,
  CheckSquare,
  Square,
  Zap,
  Package,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Truck
} from 'lucide-react';
import { format } from 'date-fns';

export default function TransitBillPage() {
  const router = useRouter();
  const { user, requireAuth } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  
  // Data states
  const [kaatBills, setKaatBills] = useState([]);
  const [selectedBills, setSelectedBills] = useState([]);
  const [enrichedBillsData, setEnrichedBillsData] = useState({});
  const [challanDetailsMap, setChallanDetailsMap] = useState({});
  
  // Filter states for existing bills
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [challanFrom, setChallanFrom] = useState('');
  const [challanTo, setChallanTo] = useState('');
  const [filterPrinted, setFilterPrinted] = useState('all');
  
  // PDF states
  const [showPreview, setShowPreview] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfSettings, setPdfSettings] = useState(null);
  const [billDate, setBillDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // ====== NEW: Bulk Create from Challan Range ======
  const [activeTab, setActiveTab] = useState('create'); // 'create' or 'existing'
  
  // Challan range for bulk create
  const [bulkChallanFrom, setBulkChallanFrom] = useState('');
  const [bulkChallanTo, setBulkChallanTo] = useState('');
  
  // Transport admin data
  const [transportAdmins, setTransportAdmins] = useState([]);
  const [transportAdminSubTransports, setTransportAdminSubTransports] = useState({});
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  
  // Loaded challan bilties data
  const [challanBilties, setChallanBilties] = useState([]); // { challan_no, gr_no, bilty, station }
  const [loadingBilties, setLoadingBilties] = useState(false);
  const [biltiesLoaded, setBiltiesLoaded] = useState(false);
  const [loadedChallanNos, setLoadedChallanNos] = useState([]);
  const [alreadySavedGrNos, setAlreadySavedGrNos] = useState([]);
  const [cities, setCities] = useState([]);
  
  // Admin selection for bulk create
  const [bulkSelectedAdmins, setBulkSelectedAdmins] = useState([]);
  const [bulkAdminSearch, setBulkAdminSearch] = useState('');
  const [bulkCreating, setBulkCreating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, results: [] });
  const [expandedAdmin, setExpandedAdmin] = useState(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && user) {
      loadKaatBills();
      loadTransportAdmins();
    }
  }, [mounted, user]);

  // ====== Load Transport Admins ======
  const loadTransportAdmins = async () => {
    try {
      setLoadingAdmins(true);
      const { data: admins, error: adminError } = await supabase
        .from('transport_admin')
        .select('transport_id, transport_name, gstin, hub_mobile_number, owner_name')
        .order('transport_name');
      if (adminError) throw adminError;
      setTransportAdmins(admins || []);

      const { data: subTransports, error: subError } = await supabase
        .from('transports')
        .select('id, transport_name, gst_number, city_id, city_name, transport_admin_id')
        .not('transport_admin_id', 'is', null);
      if (subError) throw subError;

      const adminMap = {};
      (subTransports || []).forEach(t => {
        if (!adminMap[t.transport_admin_id]) adminMap[t.transport_admin_id] = [];
        adminMap[t.transport_admin_id].push(t);
      });
      setTransportAdminSubTransports(adminMap);

      // Also load cities
      const { data: citiesData } = await supabase
        .from('cities')
        .select('id, city_name, city_code')
        .order('city_name');
      setCities(citiesData || []);

    } catch (err) {
      console.error('❌ Error loading transport admins:', err);
    } finally {
      setLoadingAdmins(false);
    }
  };

  // ====== Load Bilties for Challan Range ======
  const loadBiltiesForChallanRange = async () => {
    if (!bulkChallanFrom && !bulkChallanTo) {
      alert('Please enter at least one challan number');
      return;
    }

    try {
      setLoadingBilties(true);
      setBiltiesLoaded(false);
      setChallanBilties([]);
      setAlreadySavedGrNos([]);
      setBulkSelectedAdmins([]);
      setBulkProgress({ current: 0, total: 0, results: [] });

      // Step 1: Get challans in range
      let challanQuery = supabase
        .from('challan_details')
        .select('challan_no')
        .eq('is_active', true)
        .order('challan_no');

      // Filter by range - get all and filter in JS for flexibility
      const { data: allChallans, error: challanError } = await challanQuery;
      if (challanError) throw challanError;

      const fromNum = bulkChallanFrom ? parseInt(bulkChallanFrom.replace(/\D/g, '') || '0', 10) : 0;
      const toNum = bulkChallanTo ? parseInt(bulkChallanTo.replace(/\D/g, '') || '999999', 10) : 999999;

      const filteredChallans = (allChallans || []).filter(c => {
        const num = parseInt(c.challan_no?.replace(/\D/g, '') || '0', 10);
        return num >= fromNum && num <= toNum;
      });

      if (filteredChallans.length === 0) {
        alert('No challans found in the given range');
        setLoadingBilties(false);
        return;
      }

      const challanNos = filteredChallans.map(c => c.challan_no);
      setLoadedChallanNos(challanNos);
      console.log(`📦 Loading bilties for ${challanNos.length} challans:`, challanNos);

      // Step 2: Fetch transit details for all challans
      let allTransitDetails = [];
      const batchSize = 50;
      for (let i = 0; i < challanNos.length; i += batchSize) {
        const batch = challanNos.slice(i, i + batchSize);
        const { data: transitBatch, error: transitError } = await supabase
          .from('transit_details')
          .select('challan_no, gr_no, bilty_id')
          .in('challan_no', batch);
        if (transitError) throw transitError;
        allTransitDetails = [...allTransitDetails, ...(transitBatch || [])];
      }

      console.log(`✅ Loaded ${allTransitDetails.length} transit details`);

      // Step 3: Get unique GR numbers and fetch bilty data
      const grNumbers = [...new Set(allTransitDetails.map(t => t.gr_no).filter(Boolean))];
      
      let regularBiltiesData = [];
      let stationBiltiesData = [];
      const grBatchSize = 100;

      for (let i = 0; i < grNumbers.length; i += grBatchSize) {
        const grBatch = grNumbers.slice(i, i + grBatchSize);
        const [regularRes, stationRes] = await Promise.all([
          supabase
            .from('bilty')
            .select('id, gr_no, bilty_date, consignor_name, consignee_name, payment_mode, no_of_pkg, total, to_city_id, wt, rate, freight_amount, transport_name, transport_gst, delivery_type, labour_charge, bill_charge, toll_charge, dd_charge, other_charge, is_active')
            .in('gr_no', grBatch)
            .eq('is_active', true),
          supabase
            .from('station_bilty_summary')
            .select('id, station, gr_no, consignor, consignee, contents, no_of_packets, weight, payment_status, amount, pvt_marks')
            .in('gr_no', grBatch)
        ]);
        regularBiltiesData = [...regularBiltiesData, ...(regularRes.data || [])];
        stationBiltiesData = [...stationBiltiesData, ...(stationRes.data || [])];
      }

      // Create maps
      const biltyMap = {};
      const stationMap = {};
      regularBiltiesData.forEach(b => { biltyMap[b.gr_no?.toString().trim().toUpperCase()] = b; });
      stationBiltiesData.forEach(s => { stationMap[s.gr_no?.toString().trim().toUpperCase()] = s; });

      // Combine
      const enrichedData = allTransitDetails.map(transit => {
        const normalizedGr = transit.gr_no?.toString().trim().toUpperCase();
        return {
          challan_no: transit.challan_no,
          gr_no: transit.gr_no,
          bilty: biltyMap[normalizedGr] || null,
          station: stationMap[normalizedGr] || null
        };
      });

      setChallanBilties(enrichedData);

      // Step 4: Check which GR numbers already have kaat bills
      const { data: existingBills } = await supabase
        .from('kaat_bill_master')
        .select('gr_numbers')
        .in('challan_no', challanNos);

      const savedGrNos = (existingBills || []).reduce((acc, bill) => {
        return [...acc, ...(bill.gr_numbers || []).map(gr => String(gr).trim().toUpperCase())];
      }, []);
      setAlreadySavedGrNos([...new Set(savedGrNos)]);

      setBiltiesLoaded(true);
      console.log(`✅ Loaded ${enrichedData.length} bilties, ${savedGrNos.length} already saved`);

    } catch (err) {
      console.error('❌ Error loading bilties:', err);
      alert('Error loading bilties: ' + err.message);
    } finally {
      setLoadingBilties(false);
    }
  };

  // ====== Group bilties by transport admin ======
  const adminBiltyGroups = useMemo(() => {
    if (!biltiesLoaded || challanBilties.length === 0) return [];

    const groups = [];

    for (const admin of transportAdmins) {
      const subTransports = transportAdminSubTransports[admin.transport_id] || [];
      if (subTransports.length === 0) continue;

      const subGsts = subTransports.map(t => t.gst_number?.trim()).filter(Boolean);
      const subNames = subTransports.map(t => t.transport_name?.toLowerCase().trim()).filter(Boolean);
      const subCityIds = subTransports.map(t => t.city_id).filter(Boolean);

      // Find all bilties across all challans that match this admin's sub-transports
      const matchingBilties = challanBilties.filter(t => {
        const normalizedGrNo = String(t.gr_no).trim().toUpperCase();
        if (alreadySavedGrNos.includes(normalizedGrNo)) return false;

        const biltyGst = t.bilty?.transport_gst?.trim();
        const biltyName = t.bilty?.transport_name?.toLowerCase().trim();
        const stationCode = t.station?.station;
        const stationCityId = stationCode ? cities?.find(c => c.city_code === stationCode)?.id : null;

        if (biltyGst && subGsts.includes(biltyGst)) return true;
        if (biltyName && subNames.includes(biltyName)) return true;
        if (stationCityId && subCityIds.includes(stationCityId)) return true;
        if (t.bilty?.to_city_id && subCityIds.includes(t.bilty.to_city_id)) return true;

        return false;
      });

      if (matchingBilties.length > 0) {
        // Group by challan_no then by unique transport
        const challanGroups = {};
        matchingBilties.forEach(t => {
          const key = t.challan_no;
          if (!challanGroups[key]) challanGroups[key] = [];
          challanGroups[key].push(t);
        });

        // For each challan, group by transport name+gst
        const perChallanTransports = {};
        Object.entries(challanGroups).forEach(([challanNo, bilties]) => {
          const transportMap = {};
          bilties.forEach(t => {
            const tName = t.bilty?.transport_name || 'Station Bilty';
            const tGst = t.bilty?.transport_gst || '';
            const key = `${tName}|||${tGst}`;
            if (!transportMap[key]) transportMap[key] = { name: tName, gst: tGst || null, bilties: [] };
            transportMap[key].bilties.push(t);
          });
          perChallanTransports[challanNo] = Object.values(transportMap);
        });

        const uniqueChallans = Object.keys(challanGroups).sort();

        groups.push({
          adminId: admin.transport_id,
          adminName: admin.transport_name,
          adminGstin: admin.gstin,
          ownerName: admin.owner_name,
          totalBilties: matchingBilties.length,
          challanCount: uniqueChallans.length,
          challans: uniqueChallans,
          perChallanTransports,
          subTransportCount: subTransports.length
        });
      }
    }

    return groups.sort((a, b) => b.totalBilties - a.totalBilties);
  }, [biltiesLoaded, challanBilties, transportAdmins, transportAdminSubTransports, alreadySavedGrNos, cities]);

  // ====== Handle Bulk Create Kaat Bills ======
  const handleBulkCreateKaatBills = async () => {
    const selectedGroups = adminBiltyGroups.filter(g => bulkSelectedAdmins.includes(g.adminId));
    if (selectedGroups.length === 0) {
      alert('Please select at least one transport admin');
      return;
    }

    // Count total bills
    let totalBills = 0;
    selectedGroups.forEach(g => {
      Object.values(g.perChallanTransports).forEach(transports => {
        totalBills += transports.length;
      });
    });

    if (!window.confirm(
      `This will create ${totalBills} kaat bill(s) across ${selectedGroups.length} transport admin(s).\n\n` +
      selectedGroups.map(g => `🏢 ${g.adminName}: ${g.challanCount} challan(s), ${g.totalBilties} bilties`).join('\n') +
      '\n\nContinue?'
    )) return;

    setBulkCreating(true);
    setBulkProgress({ current: 0, total: totalBills, results: [] });
    const currentUser = getCurrentUser();
    const results = [];
    let processed = 0;

    for (const group of selectedGroups) {
      for (const [challanNo, transports] of Object.entries(group.perChallanTransports)) {
        for (const transport of transports) {
          processed++;
          setBulkProgress(prev => ({ ...prev, current: processed }));

          try {
            const grNumbers = transport.bilties.map(t => String(t.gr_no).trim().toUpperCase());

            // Calculate kaat amount
            const { totalKaatAmount, error: calcError } = await calculateTotalKaatAmount(transport.bilties);
            if (calcError) throw calcError;

            const kaatBillData = {
              challan_no: challanNo,
              transport_name: transport.name,
              transport_gst: transport.gst,
              transport_admin_id: group.adminId,
              gr_numbers: grNumbers,
              total_bilty_count: grNumbers.length,
              total_kaat_amount: totalKaatAmount,
              created_by: currentUser.id,
              updated_by: currentUser.id,
              printed_yet: false
            };

            const { success, error } = await saveKaatBillToDatabase(kaatBillData);
            if (!success) throw error;

            results.push({
              admin: group.adminName,
              challan: challanNo,
              transport: transport.name,
              bilties: grNumbers.length,
              amount: totalKaatAmount,
              status: 'success'
            });
          } catch (err) {
            console.error(`❌ Error creating bill for ${transport.name} (${challanNo}):`, err);
            results.push({
              admin: group.adminName,
              challan: challanNo,
              transport: transport.name,
              bilties: transport.bilties.length,
              amount: 0,
              status: 'error',
              error: err.message
            });
          }
        }
      }
    }

    setBulkProgress(prev => ({ ...prev, results }));

    const successCount = results.filter(r => r.status === 'success').length;
    const failCount = results.filter(r => r.status === 'error').length;
    setBulkCreating(false);

    // Refresh saved GR numbers
    if (loadedChallanNos.length > 0) {
      const { data: updatedData } = await supabase
        .from('kaat_bill_master')
        .select('gr_numbers')
        .in('challan_no', loadedChallanNos);
      if (updatedData) {
        const allSavedGrNos = updatedData.reduce((acc, bill) => {
          return [...acc, ...(bill.gr_numbers || []).map(gr => String(gr).trim().toUpperCase())];
        }, []);
        setAlreadySavedGrNos([...new Set(allSavedGrNos)]);
      }
    }

    // Refresh kaat bills list too
    await loadKaatBills();

    if (failCount === 0) {
      alert(`✅ All ${successCount} kaat bill(s) created successfully!`);
      setBulkSelectedAdmins([]);
      setBulkProgress({ current: 0, total: 0, results: [] });
    } else {
      alert(`⚠️ ${successCount} bill(s) created, ${failCount} failed. Check results.`);
    }
  };

  // ====== Existing Bills Logic (unchanged) ======
  const loadKaatBills = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('kaat_bill_master')
        .select(`
          *,
          created_user:users!fk_kaat_bill_created_by(username, name)
        `)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setKaatBills(data || []);
    } catch (err) {
      console.error('❌ Error loading kaat bills:', err);
      setError(err.message || 'Failed to load kaat bills');
    } finally {
      setLoading(false);
    }
  };

  const filteredBills = kaatBills.filter(bill => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesChallan = bill.challan_no?.toLowerCase().includes(query);
      const matchesTransport = bill.transport_name?.toLowerCase().includes(query);
      const matchesGst = bill.transport_gst?.toLowerCase().includes(query);
      if (!matchesChallan && !matchesTransport && !matchesGst) return false;
    }
    if (challanFrom || challanTo) {
      const challanNum = parseInt(bill.challan_no?.replace(/\D/g, '') || '0', 10);
      if (challanFrom) {
        const fromNum = parseInt(challanFrom.replace(/\D/g, '') || '0', 10);
        if (challanNum < fromNum) return false;
      }
      if (challanTo) {
        const toNum = parseInt(challanTo.replace(/\D/g, '') || '0', 10);
        if (challanNum > toNum) return false;
      }
    }
    if (dateFrom) {
      const bd = new Date(bill.created_at);
      if (bd < new Date(dateFrom)) return false;
    }
    if (dateTo) {
      const bd = new Date(bill.created_at);
      const td = new Date(dateTo);
      td.setHours(23, 59, 59, 999);
      if (bd > td) return false;
    }
    if (filterPrinted === 'printed' && !bill.printed_yet) return false;
    if (filterPrinted === 'not_printed' && bill.printed_yet) return false;
    return true;
  });

  const handleToggleBill = (bill) => {
    setSelectedBills(prev => {
      const isSelected = prev.some(b => b.id === bill.id);
      return isSelected ? prev.filter(b => b.id !== bill.id) : [...prev, bill];
    });
  };

  const handleSelectAll = () => setSelectedBills([...filteredBills]);
  const handleDeselectAll = () => setSelectedBills([]);

  const fetchBillDetails = async (bills) => {
    const enrichedData = {};
    for (const bill of bills) {
      try {
        const [kaatResult, biltyResult, stationResult] = await Promise.all([
          supabase.from('bilty_wise_kaat').select('*').in('gr_no', bill.gr_numbers || []),
          supabase.from('bilty').select('*').in('gr_no', bill.gr_numbers || []).eq('is_active', true),
          supabase.from('station_bilty_summary').select('*').in('gr_no', bill.gr_numbers || [])
        ]);
        const kaatMap = {}, biltyMap = {}, stationMapLocal = {};
        (kaatResult.data || []).forEach(k => { kaatMap[k.gr_no] = k; });
        (biltyResult.data || []).forEach(b => { biltyMap[b.gr_no] = b; });
        (stationResult.data || []).forEach(s => { stationMapLocal[s.gr_no] = s; });
        const details = (bill.gr_numbers || []).map(grNo => ({
          gr_no: grNo, kaat: kaatMap[grNo] || null, bilty: biltyMap[grNo] || null, station: stationMapLocal[grNo] || null
        }));
        let transportInfo = { transport_name: bill.transport_name, transport_gst: bill.transport_gst };
        if (bill.transport_gst) {
          const { data: transport } = await supabase.from('transports').select('transport_name, gst_number, mob_number').eq('gst_number', bill.transport_gst).limit(1).single();
          if (transport) transportInfo = { transport_name: transport.transport_name, transport_gst: transport.gst_number, transport_number: transport.mob_number };
        }
        enrichedData[bill.id] = { details, transportInfo };
      } catch (err) {
        enrichedData[bill.id] = { details: [], transportInfo: {} };
      }
    }
    return enrichedData;
  };

  const fetchChallanDetails = async (challanNos) => {
    try {
      const { data, error } = await supabase.from('challan_details').select('challan_no, date, dispatch_date, is_dispatched').in('challan_no', challanNos);
      if (error) throw error;
      const detailsMap = {};
      (data || []).forEach(item => { detailsMap[item.challan_no] = item; });
      return detailsMap;
    } catch (err) { return {}; }
  };

  const handleOpenSettings = () => {
    if (selectedBills.length === 0) { alert('Please select at least one kaat bill'); return; }
    setShowSettings(true);
  };

  const handleGeneratePDF = async (settings) => {
    setShowSettings(false);
    try {
      setGenerating(true);
      const enrichedData = await fetchBillDetails(selectedBills);
      setEnrichedBillsData(enrichedData);
      const challanNos = selectedBills.map(b => b.challan_no);
      const challanDetails = await fetchChallanDetails(challanNos);
      setChallanDetailsMap(challanDetails);
      setPdfSettings(settings);
      const url = generateConsolidatedKaatPDF(selectedBills, enrichedData, settings, challanDetails, true, cities);
      setPdfUrl(url);
      setShowPreview(true);
    } catch (err) {
      alert('Failed to generate PDF: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      generateConsolidatedKaatPDF(selectedBills, enrichedBillsData, pdfSettings, challanDetailsMap, false, cities);
      const billIds = selectedBills.map(b => b.id);
      await supabase.from('kaat_bill_master').update({ printed_yet: true }).in('id', billIds);
      await loadKaatBills();
      alert('✅ PDF downloaded successfully!');
    } catch (err) { throw err; }
  };

  const closePreview = () => {
    setShowPreview(false);
    if (pdfUrl) { URL.revokeObjectURL(pdfUrl); setPdfUrl(null); }
  };

  const totalBilties = selectedBills.reduce((sum, bill) => sum + (bill.total_bilty_count || 0), 0);
  const totalKaatAmount = selectedBills.reduce((sum, bill) => sum + parseFloat(bill.total_kaat_amount || 0), 0);

  // Filtered admins by search
  const filteredAdminGroups = adminBiltyGroups.filter(g => {
    if (!bulkAdminSearch) return true;
    const q = bulkAdminSearch.toLowerCase();
    return g.adminName?.toLowerCase().includes(q) || g.adminGstin?.toLowerCase().includes(q) || g.ownerName?.toLowerCase().includes(q);
  });

  // Stats
  const totalUnsavedBilties = adminBiltyGroups.reduce((sum, g) => sum + g.totalBilties, 0);
  const selectedAdminGroups = adminBiltyGroups.filter(g => bulkSelectedAdmins.includes(g.adminId));
  const selectedBiltiesCount = selectedAdminGroups.reduce((sum, g) => sum + g.totalBilties, 0);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-6 max-w-[1400px]">
        {/* Header */}
        <div className="mb-6 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push('/transit-finance')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-900 via-purple-800 to-indigo-800 bg-clip-text text-transparent">
                  Consolidated Transit Bill
                </h1>
                <p className="text-gray-600 mt-1">Create kaat bills from challan range or print existing bills</p>
              </div>
            </div>
            <button onClick={() => { loadKaatBills(); loadTransportAdmins(); }} disabled={loading} className="p-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors" title="Refresh">
              <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'create'
                ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:bg-gray-50 shadow'
            }`}
          >
            <Layers className="w-5 h-5" />
            Bulk Create Kaat Bills
          </button>
          <button
            onClick={() => setActiveTab('existing')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'existing'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:bg-gray-50 shadow'
            }`}
          >
            <Printer className="w-5 h-5" />
            Print Existing Bills
          </button>
        </div>

        {/* ======== TAB 1: BULK CREATE FROM CHALLAN RANGE ======== */}
        {activeTab === 'create' && (
          <div className="space-y-6">
            {/* Step 1: Challan Range Selector */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-teal-600 to-emerald-600 p-4 text-white">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Step 1: Select Challan Range
                </h3>
                <p className="text-sm text-white/80 mt-1">Enter challan range to load bilties and group by transport admin</p>
              </div>
              <div className="p-5">
                <div className="flex items-end gap-4 flex-wrap">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Challan From</label>
                    <input
                      type="text"
                      value={bulkChallanFrom}
                      onChange={(e) => setBulkChallanFrom(e.target.value)}
                      placeholder="e.g. 0152"
                      className="w-40 px-3 py-2.5 border-2 border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-teal-50 font-mono text-lg"
                    />
                  </div>
                  <div className="text-gray-400 font-bold text-xl pb-2">→</div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Challan To</label>
                    <input
                      type="text"
                      value={bulkChallanTo}
                      onChange={(e) => setBulkChallanTo(e.target.value)}
                      placeholder="e.g. 0160"
                      className="w-40 px-3 py-2.5 border-2 border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-teal-50 font-mono text-lg"
                    />
                  </div>
                  <button
                    onClick={loadBiltiesForChallanRange}
                    disabled={loadingBilties || (!bulkChallanFrom && !bulkChallanTo)}
                    className="px-6 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-lg font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loadingBilties ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Loading...</>
                    ) : (
                      <><Zap className="w-5 h-5" /> Load Bilties</>
                    )}
                  </button>
                  {biltiesLoaded && (
                    <div className="flex items-center gap-3 ml-4">
                      <span className="bg-teal-100 text-teal-800 px-3 py-1.5 rounded-full text-sm font-bold">
                        {loadedChallanNos.length} Challans
                      </span>
                      <span className="bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-sm font-bold">
                        {challanBilties.length} Total Bilties
                      </span>
                      <span className="bg-orange-100 text-orange-800 px-3 py-1.5 rounded-full text-sm font-bold">
                        {totalUnsavedBilties} Unsaved
                      </span>
                      <span className="bg-green-100 text-green-800 px-3 py-1.5 rounded-full text-sm font-bold">
                        {alreadySavedGrNos.length} Already Saved
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Step 2: Transport Admin List */}
            {biltiesLoaded && (
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold flex items-center gap-2">
                        <Building2 className="w-5 h-5" />
                        Step 2: Select Transport Admins & Create Bills
                      </h3>
                      <p className="text-sm text-white/80 mt-1">
                        {adminBiltyGroups.length} transport admin(s) with unsaved bilties found
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {adminBiltyGroups.length > 0 && (
                        <>
                          <button
                            onClick={() => setBulkSelectedAdmins(adminBiltyGroups.map(g => g.adminId))}
                            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-semibold transition-all"
                          >
                            Select All ({adminBiltyGroups.length})
                          </button>
                          <button
                            onClick={() => setBulkSelectedAdmins([])}
                            disabled={bulkSelectedAdmins.length === 0}
                            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
                          >
                            Clear
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Search & Create Bar */}
                {adminBiltyGroups.length > 0 && (
                  <div className="p-4 bg-gray-50 border-b flex items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={bulkAdminSearch}
                        onChange={(e) => setBulkAdminSearch(e.target.value)}
                        placeholder="Search transport admin..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      {bulkSelectedAdmins.length > 0 && (
                        <span className="bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full text-sm font-bold">
                          {bulkSelectedAdmins.length} selected • {selectedBiltiesCount} bilties
                        </span>
                      )}
                      <button
                        onClick={handleBulkCreateKaatBills}
                        disabled={bulkSelectedAdmins.length === 0 || bulkCreating}
                        className="px-6 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-lg font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {bulkCreating ? (
                          <><Loader2 className="w-5 h-5 animate-spin" /> Creating...</>
                        ) : (
                          <><Zap className="w-5 h-5" /> Create Kaat Bills ({bulkSelectedAdmins.length})</>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Progress Bar */}
                {bulkCreating && (
                  <div className="px-4 py-3 bg-blue-50 border-b">
                    <div className="flex items-center justify-between text-sm text-blue-700 mb-2">
                      <span className="font-medium">Creating bills... {bulkProgress.current}/{bulkProgress.total}</span>
                      <span>{Math.round((bulkProgress.current / bulkProgress.total) * 100)}%</span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Results Summary */}
                {bulkProgress.results.length > 0 && !bulkCreating && (
                  <div className="px-4 py-3 bg-green-50 border-b">
                    <div className="text-sm font-semibold text-green-700 mb-2">
                      ✅ {bulkProgress.results.filter(r => r.status === 'success').length} created,{' '}
                      {bulkProgress.results.filter(r => r.status === 'error').length} failed
                    </div>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {bulkProgress.results.map((r, i) => (
                        <div key={i} className={`text-xs px-2 py-1 rounded ${r.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {r.status === 'success' ? '✓' : '✗'} {r.admin} → {r.challan} → {r.transport} ({r.bilties} bilties, ₹{r.amount?.toFixed(2) || 0})
                          {r.error && <span className="ml-2 text-red-600">{r.error}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Admin List */}
                <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                  {adminBiltyGroups.length === 0 ? (
                    <div className="p-8 text-center">
                      <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">No unsaved bilties found for any transport admin</p>
                      <p className="text-gray-400 text-sm mt-1">All bilties in this range may already have kaat bills</p>
                    </div>
                  ) : (
                    filteredAdminGroups.map((group) => {
                      const isSelected = bulkSelectedAdmins.includes(group.adminId);
                      const isExpanded = expandedAdmin === group.adminId;

                      return (
                        <div key={group.adminId} className={`${isSelected ? 'bg-indigo-50/50' : ''}`}>
                          {/* Admin Row */}
                          <div className="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => {
                              setBulkSelectedAdmins(prev =>
                                prev.includes(group.adminId) ? prev.filter(id => id !== group.adminId) : [...prev, group.adminId]
                              );
                            }}
                          >
                            {/* Checkbox */}
                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                              isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 hover:border-indigo-400'
                            }`}>
                              {isSelected && <Check className="w-4 h-4 text-white" />}
                            </div>

                            {/* Admin Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className="font-bold text-gray-900 text-base">{group.adminName}</span>
                                {group.adminGstin && (
                                  <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full font-mono">
                                    {group.adminGstin}
                                  </span>
                                )}
                                {group.ownerName && (
                                  <span className="text-gray-500 text-sm">({group.ownerName})</span>
                                )}
                              </div>
                              <div className="flex items-center gap-4 mt-1.5 text-sm">
                                <span className="text-blue-600 font-semibold">{group.totalBilties} bilties</span>
                                <span className="text-teal-600">{group.challanCount} challan(s)</span>
                                <span className="text-gray-500">{group.subTransportCount} sub-transports</span>
                              </div>
                            </div>

                            {/* Expand Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedAdmin(isExpanded ? null : group.adminId);
                              }}
                              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                              {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                            </button>
                          </div>

                          {/* Expanded Detail */}
                          {isExpanded && (
                            <div className="px-4 pb-4 pl-14">
                              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                                <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                                  Challan-wise Breakdown
                                </div>
                                {group.challans.map(challanNo => {
                                  const transports = group.perChallanTransports[challanNo] || [];
                                  const totalBilties = transports.reduce((sum, t) => sum + t.bilties.length, 0);
                                  return (
                                    <div key={challanNo} className="bg-white rounded-lg p-2.5 border border-gray-200">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                          <span className="bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full text-xs font-bold">
                                            {challanNo}
                                          </span>
                                          <span className="text-sm text-gray-600">{totalBilties} bilties</span>
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          {transports.map((t, ti) => (
                                            <span key={ti} className="bg-teal-50 text-teal-700 text-xs px-2 py-0.5 rounded-full border border-teal-200">
                                              <Truck className="w-3 h-3 inline mr-1" />
                                              {t.name} ({t.bilties.length})
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======== TAB 2: EXISTING BILLS (Print) ======== */}
        {activeTab === 'existing' && (
          <div className="space-y-6">
            {/* Error State */}
            {error && (
              <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg mx-auto text-center">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Error Loading Data</h2>
                <p className="text-gray-600 mb-6">{error}</p>
                <button onClick={loadKaatBills} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-2 mx-auto">
                  <RefreshCw className="w-5 h-5" /> Try Again
                </button>
              </div>
            )}

            {!error && (
              <>
                {/* Filters */}
                <div className="bg-white rounded-xl shadow-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Search</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search challan, transport, GST..." className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Challan From</label>
                      <input type="text" value={challanFrom} onChange={(e) => setChallanFrom(e.target.value)} placeholder="e.g. 0152" className="w-full px-3 py-2.5 border-2 border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-indigo-50" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Challan To</label>
                      <input type="text" value={challanTo} onChange={(e) => setChallanTo(e.target.value)} placeholder="e.g. 0160" className="w-full px-3 py-2.5 border-2 border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-indigo-50" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">From Date</label>
                      <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">To Date</label>
                      <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Print Status</label>
                        <select value={filterPrinted} onChange={(e) => setFilterPrinted(e.target.value)} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                          <option value="all">All Bills</option>
                          <option value="not_printed">Not Printed</option>
                          <option value="printed">Already Printed</option>
                        </select>
                      </div>
                      {(challanFrom || challanTo || dateFrom || dateTo || searchQuery || filterPrinted !== 'all') && (
                        <button onClick={() => { setChallanFrom(''); setChallanTo(''); setDateFrom(''); setDateTo(''); setSearchQuery(''); setFilterPrinted('all'); }} className="mt-6 px-4 py-2.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium text-sm">
                          Clear All Filters
                        </button>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mt-6">
                      {challanFrom && challanTo ? (
                        <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full font-medium">Challan: {challanFrom} → {challanTo}</span>
                      ) : challanFrom ? (
                        <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full font-medium">From Challan: {challanFrom}</span>
                      ) : challanTo ? (
                        <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full font-medium">Up to Challan: {challanTo}</span>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Bill Date for PDF */}
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl shadow-lg p-4 border border-indigo-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-indigo-600 p-2 rounded-lg">
                        <Calendar className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700">Bill Date (for PDF)</label>
                        <input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} className="mt-1 px-3 py-2 border-2 border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-900" />
                      </div>
                    </div>
                    <button
                      onClick={handleOpenSettings}
                      disabled={selectedBills.length === 0 || generating}
                      className="group relative bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <span className="relative z-10 flex items-center gap-2">
                        {generating ? (<><Loader2 className="w-5 h-5 animate-spin" /> Generating...</>) : (<><Printer className="w-5 h-5" /> Generate Consolidated PDF{selectedBills.length > 0 && ` (${selectedBills.length})`}</>)}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Bills Selector */}
                <KaatBillSelector
                  kaatBills={filteredBills}
                  selectedBills={selectedBills}
                  onToggleBill={handleToggleBill}
                  onSelectAll={handleSelectAll}
                  onDeselectAll={handleDeselectAll}
                  loading={loading}
                />
              </>
            )}
          </div>
        )}

        {/* Settings Modal */}
        <ConsolidatedSettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          onProceed={handleGeneratePDF}
          firstBill={selectedBills[0]}
          selectedBills={selectedBills}
          selectedBillsCount={selectedBills.length}
        />

        {/* PDF Preview Modal */}
        <ConsolidatedPDFPreview
          isOpen={showPreview}
          onClose={closePreview}
          pdfUrl={pdfUrl}
          selectedBillsCount={selectedBills.length}
          totalBilties={totalBilties}
          totalKaatAmount={totalKaatAmount}
          onDownload={handleDownloadPDF}
        />
      </div>
    </div>
  );
}
