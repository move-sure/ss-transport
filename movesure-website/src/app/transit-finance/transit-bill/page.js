'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../utils/auth';
import supabase from '../../utils/supabase';
import Navbar from '../../../components/dashboard/navbar';
import KaatBillSelector from '../../../components/transit-finance/kaat-bill/kaat-bill-selector';
import ConsolidatedPDFPreview from '../../../components/transit-finance/kaat-bill/consolidated-pdf-preview';
import ConsolidatedSettingsModal from '../../../components/transit-finance/kaat-bill/consolidated-settings-modal';
import { generateConsolidatedKaatPDF } from '../../../components/transit-finance/kaat-bill/consolidated-pdf-generator';
import { 
  FileText, 
  Loader2, 
  AlertCircle, 
  ArrowLeft, 
  Printer, 
  RefreshCw,
  Calendar,
  Search,
  Package,
  Check,
  X,
  Truck,
  ChevronDown,
  ChevronRight,
  Hash
} from 'lucide-react';
import { format } from 'date-fns';

export default function TransitBillPage() {
  const router = useRouter();
  const { user, requireAuth } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  
  // Tab state
  const [activeTab, setActiveTab] = useState('consolidated'); // 'consolidated' | 'search-bilties'
  
  // Data states
  const [kaatBills, setKaatBills] = useState([]);
  const [selectedBills, setSelectedBills] = useState([]);
  const [enrichedBillsData, setEnrichedBillsData] = useState({});
  const [challanDetailsMap, setChallanDetailsMap] = useState({});
  
  // Filter states for existing bills (applied on search click, not on every keystroke)
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [challanFrom, setChallanFrom] = useState('');
  const [challanTo, setChallanTo] = useState('');
  const [filterPrinted, setFilterPrinted] = useState('all');
  // Applied filters (only updated when user clicks Search)
  const [appliedFilters, setAppliedFilters] = useState({ searchQuery: '', dateFrom: '', dateTo: '', challanFrom: '', challanTo: '', filterPrinted: 'all' });
  // Challan details map for dispatch dates
  const [billChallanDetails, setBillChallanDetails] = useState({});
  
  // PDF states
  const [showPreview, setShowPreview] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfSettings, setPdfSettings] = useState(null);
  const [billDate, setBillDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  // Cities data (needed for PDF generation)
  const [cities, setCities] = useState([]);

  // ====== Search Bilties Tab State ======
  const [transportSearch, setTransportSearch] = useState('');
  const [transportSuggestions, setTransportSuggestions] = useState([]);
  const [selectedTransport, setSelectedTransport] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [sbChallanFrom, setSbChallanFrom] = useState('');
  const [sbChallanTo, setSbChallanTo] = useState('');
  const [sbLoading, setSbLoading] = useState(false);
  const [sbBilties, setSbBilties] = useState([]);
  const [sbBiltyDetails, setSbBiltyDetails] = useState({});
  const [sbCitiesMap, setSbCitiesMap] = useState({});
  const [sbError, setSbError] = useState(null);
  const [sbExpandedChallans, setSbExpandedChallans] = useState({});

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && user) {
      loadKaatBills();
    }
  }, [mounted, user]);

  // ====== Load Existing Kaat Bills ======
  const loadKaatBills = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load cities for PDF generation
      const { data: citiesData } = await supabase
        .from('cities')
        .select('id, city_name, city_code')
        .order('city_name');
      setCities(citiesData || []);

      const { data, error: fetchError } = await supabase
        .from('kaat_bill_master')
        .select(`
          *,
          created_user:users!fk_kaat_bill_created_by(username, name)
        `)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setKaatBills(data || []);

      // Fetch challan dispatch dates for all unique challan numbers
      const uniqueChallans = [...new Set((data || []).map(b => b.challan_no).filter(Boolean))];
      if (uniqueChallans.length > 0) {
        const batchSize = 100;
        let allChallanDetails = [];
        for (let i = 0; i < uniqueChallans.length; i += batchSize) {
          const batch = uniqueChallans.slice(i, i + batchSize);
          const { data: challanData } = await supabase
            .from('challan_details')
            .select('challan_no, date, dispatch_date, is_dispatched')
            .in('challan_no', batch);
          allChallanDetails = [...allChallanDetails, ...(challanData || [])];
        }
        const detailsMap = {};
        allChallanDetails.forEach(c => { detailsMap[c.challan_no] = c; });
        setBillChallanDetails(detailsMap);
      }
    } catch (err) {
      console.error('❌ Error loading kaat bills:', err);
      setError(err.message || 'Failed to load kaat bills');
    } finally {
      setLoading(false);
    }
  };

  // Apply search button handler
  const handleApplySearch = () => {
    setAppliedFilters({ searchQuery, dateFrom, dateTo, challanFrom, challanTo, filterPrinted });
  };

  const handleClearFilters = () => {
    setChallanFrom(''); setChallanTo(''); setDateFrom(''); setDateTo(''); setSearchQuery(''); setFilterPrinted('all');
    setAppliedFilters({ searchQuery: '', dateFrom: '', dateTo: '', challanFrom: '', challanTo: '', filterPrinted: 'all' });
  };

  // Filter bills using APPLIED filters only (not live input values)
  const filteredBills = useMemo(() => {
    const { searchQuery: sq, dateFrom: df, dateTo: dt, challanFrom: cf, challanTo: ct, filterPrinted: fp } = appliedFilters;
    return kaatBills.filter(bill => {
      if (sq) {
        const query = sq.toLowerCase();
        const matchesChallan = bill.challan_no?.toLowerCase().includes(query);
        const matchesTransport = bill.transport_name?.toLowerCase().includes(query);
        const matchesGst = bill.transport_gst?.toLowerCase().includes(query);
        if (!matchesChallan && !matchesTransport && !matchesGst) return false;
      }
      if (cf || ct) {
        const challanNum = parseInt(bill.challan_no?.replace(/\D/g, '') || '0', 10);
        if (cf) { const fromNum = parseInt(cf.replace(/\D/g, '') || '0', 10); if (challanNum < fromNum) return false; }
        if (ct) { const toNum = parseInt(ct.replace(/\D/g, '') || '0', 10); if (challanNum > toNum) return false; }
      }
      // Filter by challan dispatch_date instead of bill created_at
      if (df || dt) {
        const challanDetail = billChallanDetails[bill.challan_no];
        const dispatchDate = challanDetail?.dispatch_date || challanDetail?.date;
        if (!dispatchDate) return false;
        const dd = new Date(dispatchDate);
        if (df && dd < new Date(df)) return false;
        if (dt) { const td = new Date(dt); td.setHours(23, 59, 59, 999); if (dd > td) return false; }
      }
      if (fp === 'printed' && !bill.printed_yet) return false;
      if (fp === 'not_printed' && bill.printed_yet) return false;
      return true;
    });
  }, [kaatBills, appliedFilters, billChallanDetails]);

  // Group filtered bills by challan number, sorted numerically
  const groupedBillsByChallan = useMemo(() => {
    const groups = {};
    filteredBills.forEach(bill => {
      const challan = bill.challan_no || 'Unknown';
      if (!groups[challan]) groups[challan] = [];
      groups[challan].push(bill);
    });
    // Sort challan numbers numerically
    return Object.entries(groups).sort(([a], [b]) => {
      const numA = parseInt(a.replace(/\D/g, '') || '0', 10);
      const numB = parseInt(b.replace(/\D/g, '') || '0', 10);
      return numA - numB;
    });
  }, [filteredBills]);

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

  // ====== Search Bilties Tab Functions ======
  const handleTransportSearchChange = async (value) => {
    setTransportSearch(value);
    setSelectedTransport(null);
    if (value.length < 2) { setTransportSuggestions([]); setShowSuggestions(false); return; }
    try {
      const { data } = await supabase
        .from('transports')
        .select('id, transport_name, gst_number, mob_number, city_name')
        .or(`transport_name.ilike.%${value}%,gst_number.ilike.%${value}%`)
        .order('transport_name')
        .limit(15);
      setTransportSuggestions(data || []);
      setShowSuggestions(true);
    } catch (err) {
      setTransportSuggestions([]);
    }
  };

  const handleSelectTransport = (transport) => {
    setSelectedTransport(transport);
    setTransportSearch(`${transport.transport_name}${transport.gst_number ? ' | ' + transport.gst_number : ''}`);
    setShowSuggestions(false);
  };

  const handleSearchBilties = async () => {
    if (!selectedTransport) { alert('Please select a transport first'); return; }
    try {
      setSbLoading(true);
      setSbError(null);
      setSbBilties([]);
      setSbBiltyDetails({});

      // Build cities map
      if (cities.length === 0) {
        const { data: citiesData } = await supabase.from('cities').select('id, city_name, city_code').order('city_name');
        setCities(citiesData || []);
        const cMap = {};
        (citiesData || []).forEach(c => { cMap[c.id] = c.city_name; });
        setSbCitiesMap(cMap);
      } else {
        const cMap = {};
        cities.forEach(c => { cMap[c.id] = c.city_name; });
        setSbCitiesMap(cMap);
      }

      // Fetch from bilty_wise_kaat by transport_id
      let query = supabase
        .from('bilty_wise_kaat')
        .select('*')
        .eq('transport_id', selectedTransport.id)
        .order('challan_no', { ascending: true });

      const { data: kaatData, error: kaatErr } = await query;
      if (kaatErr) throw kaatErr;

      let filteredKaat = kaatData || [];

      // Apply challan range filter
      if (sbChallanFrom || sbChallanTo) {
        filteredKaat = filteredKaat.filter(k => {
          const num = parseInt(k.challan_no?.replace(/\D/g, '') || '0', 10);
          if (sbChallanFrom) { const fromNum = parseInt(sbChallanFrom.replace(/\D/g, '') || '0', 10); if (num < fromNum) return false; }
          if (sbChallanTo) { const toNum = parseInt(sbChallanTo.replace(/\D/g, '') || '0', 10); if (num > toNum) return false; }
          return true;
        });
      }

      setSbBilties(filteredKaat);

      // Fetch bilty + station details for all gr_nos
      if (filteredKaat.length > 0) {
        const grNos = filteredKaat.map(k => k.gr_no).filter(Boolean);
        const batchSize = 200;
        const detailsMap = {};
        for (let i = 0; i < grNos.length; i += batchSize) {
          const batch = grNos.slice(i, i + batchSize);
          const [biltyRes, stationRes] = await Promise.all([
            supabase.from('bilty').select('gr_no, bilty_date, consignor_name, consignee_name, no_of_pkg, wt, total, payment_mode, delivery_type, to_city_id, from_city_id').in('gr_no', batch).eq('is_active', true),
            supabase.from('station_bilty_summary').select('gr_no, created_at, consignor, consignee, no_of_packets, weight, amount, payment_status, delivery_type, station').in('gr_no', batch)
          ]);
          (biltyRes.data || []).forEach(b => { detailsMap[b.gr_no] = { ...detailsMap[b.gr_no], bilty: b }; });
          (stationRes.data || []).forEach(s => { if (!detailsMap[s.gr_no]?.bilty) detailsMap[s.gr_no] = { ...detailsMap[s.gr_no], station: s }; else detailsMap[s.gr_no] = { ...detailsMap[s.gr_no], station: s }; });
        }
        setSbBiltyDetails(detailsMap);
      }

      // Expand all challans by default
      const expandMap = {};
      filteredKaat.forEach(k => { expandMap[k.challan_no] = true; });
      setSbExpandedChallans(expandMap);

    } catch (err) {
      console.error('❌ Search bilties error:', err);
      setSbError(err.message || 'Failed to search bilties');
    } finally {
      setSbLoading(false);
    }
  };

  const handleClearSbSearch = () => {
    setTransportSearch('');
    setSelectedTransport(null);
    setSbChallanFrom('');
    setSbChallanTo('');
    setSbBilties([]);
    setSbBiltyDetails({});
    setSbError(null);
  };

  // Group search-bilties results by challan
  const sbGroupedByChallan = useMemo(() => {
    const groups = {};
    sbBilties.forEach(k => {
      const challan = k.challan_no || 'Unknown';
      if (!groups[challan]) groups[challan] = [];
      groups[challan].push(k);
    });
    return Object.entries(groups).sort(([a], [b]) => {
      const numA = parseInt(a.replace(/\D/g, '') || '0', 10);
      const numB = parseInt(b.replace(/\D/g, '') || '0', 10);
      return numA - numB;
    });
  }, [sbBilties]);

  // Totals for search bilties
  const sbTotals = useMemo(() => {
    let totalKaat = 0, totalDD = 0, totalPF = 0, totalAmt = 0, totalWt = 0, totalPkg = 0;
    sbBilties.forEach(k => {
      const detail = sbBiltyDetails[k.gr_no];
      const bilty = detail?.bilty;
      const station = detail?.station;
      const weight = parseFloat(bilty?.wt || station?.weight || 0);
      const packages = parseFloat(bilty?.no_of_pkg || station?.no_of_packets || 0);
      const rateKg = parseFloat(k.rate_per_kg) || 0;
      const ratePkg = parseFloat(k.rate_per_pkg) || 0;
      const effectiveWeight = Math.max(weight, 50);
      let kaatAmt = 0;
      if (k.rate_type === 'per_kg') kaatAmt = effectiveWeight * rateKg;
      else if (k.rate_type === 'per_pkg') kaatAmt = packages * ratePkg;
      else if (k.rate_type === 'hybrid') kaatAmt = (effectiveWeight * rateKg) + (packages * ratePkg);
      const ddChrg = parseFloat(k.dd_chrg) || 0;
      const payMode = (bilty?.payment_mode || station?.payment_status || '').toUpperCase();
      const isPaid = payMode.includes('PAID');
      const amt = isPaid ? 0 : parseFloat(bilty?.total || station?.amount || 0);
      totalKaat += kaatAmt;
      totalDD += ddChrg;
      totalAmt += amt;
      totalPF += (amt - kaatAmt - ddChrg);
      totalWt += weight;
      totalPkg += packages;
    });
    return { totalKaat, totalDD, totalPF, totalAmt, totalWt, totalPkg };
  }, [sbBilties, sbBiltyDetails]);

  const toggleSbChallan = (challan) => {
    setSbExpandedChallans(prev => ({ ...prev, [challan]: !prev[challan] }));
  };

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
                <p className="text-gray-600 mt-1">Print existing kaat bills as consolidated PDF</p>
              </div>
            </div>
            <button onClick={() => { loadKaatBills(); }} disabled={loading} className="p-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors" title="Refresh">
              <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* ======== TABS ======== */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setActiveTab('consolidated')}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'consolidated'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <Printer className="w-4 h-4" /> Consolidated Bill
          </button>
          <button
            onClick={() => setActiveTab('search-bilties')}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'search-bilties'
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-200'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <Truck className="w-4 h-4" /> Search Bilties by Transport
          </button>
        </div>

        {/* ======== TAB 1: CONSOLIDATED BILL ======== */}
        {activeTab === 'consolidated' && (
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
                {/* Filters — applied only when Search button is clicked */}
                <div className="bg-white rounded-xl shadow-lg p-5">
                  <div className="grid grid-cols-2 md:grid-cols-7 gap-3 items-end">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Challan From</label>
                      <input
                        type="text"
                        value={challanFrom}
                        onChange={(e) => setChallanFrom(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleApplySearch()}
                        placeholder="e.g. 020"
                        className="w-full px-3 py-2 border-2 border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-indigo-50/50 font-mono text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Challan To</label>
                      <input
                        type="text"
                        value={challanTo}
                        onChange={(e) => setChallanTo(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleApplySearch()}
                        placeholder="e.g. 030"
                        className="w-full px-3 py-2 border-2 border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-indigo-50/50 font-mono text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Dispatch From</label>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="w-full px-2.5 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Dispatch To</label>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="w-full px-2.5 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Status</label>
                      <select
                        value={filterPrinted}
                        onChange={(e) => setFilterPrinted(e.target.value)}
                        className="w-full px-2.5 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      >
                        <option value="all">All</option>
                        <option value="not_printed">Not Printed</option>
                        <option value="printed">Printed</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Search</label>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleApplySearch()}
                        placeholder="Transport, GST..."
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleApplySearch}
                        className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Search className="w-4 h-4" /> Search
                      </button>
                      {(challanFrom || challanTo || dateFrom || dateTo || searchQuery || filterPrinted !== 'all') && (
                        <button
                          onClick={handleClearFilters}
                          className="px-3 py-2 bg-red-100 text-red-600 rounded-lg font-semibold text-sm hover:bg-red-200 transition-colors"
                          title="Clear all filters"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Active filters summary */}
                  {(appliedFilters.challanFrom || appliedFilters.challanTo || appliedFilters.dateFrom || appliedFilters.dateTo || appliedFilters.searchQuery) && (
                    <div className="mt-3 flex items-center gap-2 flex-wrap text-xs">
                      <span className="text-gray-400 font-semibold">Active:</span>
                      {appliedFilters.challanFrom && <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">From: {appliedFilters.challanFrom}</span>}
                      {appliedFilters.challanTo && <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">To: {appliedFilters.challanTo}</span>}
                      {appliedFilters.dateFrom && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">Dispatch from: {appliedFilters.dateFrom}</span>}
                      {appliedFilters.dateTo && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">Dispatch to: {appliedFilters.dateTo}</span>}
                      {appliedFilters.searchQuery && <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-semibold">&quot;{appliedFilters.searchQuery}&quot;</span>}
                      <span className="text-gray-400">• {filteredBills.length} bills in {groupedBillsByChallan.length} challans</span>
                    </div>
                  )}
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

                {/* Bills Selector — grouped by challan */}
                <KaatBillSelector
                  kaatBills={filteredBills}
                  groupedBillsByChallan={groupedBillsByChallan}
                  challanDetailsMap={billChallanDetails}
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

        {/* ======== TAB 2: SEARCH BILTIES BY TRANSPORT ======== */}
        {activeTab === 'search-bilties' && (
          <div className="space-y-6">
            {/* Search Filters */}
            <div className="bg-white rounded-xl shadow-lg p-5">
              <div className="flex items-center gap-2 mb-4">
                <Truck className="w-5 h-5 text-teal-600" />
                <h2 className="text-lg font-bold text-gray-800">Search Bilties by Transport</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                {/* Transport Search with Autocomplete */}
                <div className="md:col-span-2 relative">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Transport Name / GST</label>
                  <input
                    type="text"
                    value={transportSearch}
                    onChange={(e) => handleTransportSearchChange(e.target.value)}
                    onFocus={() => transportSuggestions.length > 0 && setShowSuggestions(true)}
                    onKeyDown={(e) => e.key === 'Enter' && selectedTransport && handleSearchBilties()}
                    placeholder="Type transport name or GST..."
                    className={`w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm ${
                      selectedTransport ? 'border-teal-400 bg-teal-50' : 'border-teal-200 bg-teal-50/30'
                    }`}
                  />
                  {selectedTransport && (
                    <div className="mt-1 text-xs text-teal-700 font-medium">
                      <Check className="w-3 h-3 inline mr-1" />
                      {selectedTransport.transport_name} {selectedTransport.gst_number ? `| GST: ${selectedTransport.gst_number}` : ''} {selectedTransport.city_name ? `| ${selectedTransport.city_name}` : ''}
                    </div>
                  )}
                  {/* Suggestions dropdown */}
                  {showSuggestions && transportSuggestions.length > 0 && (
                    <div className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                      {transportSuggestions.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => handleSelectTransport(t)}
                          className={`w-full text-left px-3 py-2 hover:bg-teal-50 transition-colors border-b border-gray-100 last:border-0 ${
                            selectedTransport?.id === t.id ? 'bg-teal-50' : ''
                          }`}
                        >
                          <div className="font-semibold text-sm text-gray-800">{t.transport_name}</div>
                          <div className="text-xs text-gray-500">
                            {t.gst_number && <span className="mr-2">GST: {t.gst_number}</span>}
                            {t.city_name && <span className="mr-2">City: {t.city_name}</span>}
                            {t.mob_number && <span>Mob: {t.mob_number}</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Challan From</label>
                  <input
                    type="text"
                    value={sbChallanFrom}
                    onChange={(e) => setSbChallanFrom(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchBilties()}
                    placeholder="e.g. 020"
                    className="w-full px-3 py-2 border-2 border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-teal-50/30 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Challan To</label>
                  <input
                    type="text"
                    value={sbChallanTo}
                    onChange={(e) => setSbChallanTo(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchBilties()}
                    placeholder="e.g. 030"
                    className="w-full px-3 py-2 border-2 border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-teal-50/30 font-mono text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSearchBilties}
                    disabled={!selectedTransport || sbLoading}
                    className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg font-bold text-sm hover:bg-teal-700 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sbLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    {sbLoading ? 'Searching...' : 'Search'}
                  </button>
                  {(transportSearch || sbChallanFrom || sbChallanTo) && (
                    <button
                      onClick={handleClearSbSearch}
                      className="px-3 py-2 bg-red-100 text-red-600 rounded-lg font-semibold text-sm hover:bg-red-200 transition-colors"
                      title="Clear"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Error */}
            {sbError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm flex items-center gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" /> {sbError}
              </div>
            )}

            {/* Results Summary */}
            {sbBilties.length > 0 && (
              <div className="bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl shadow-lg p-4 border border-teal-100">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-teal-600 p-2 rounded-lg">
                      <Package className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="font-bold text-gray-800">
                        {selectedTransport?.transport_name}
                        {selectedTransport?.gst_number && <span className="text-gray-500 font-normal text-sm ml-2">GST: {selectedTransport.gst_number}</span>}
                      </div>
                      <div className="text-sm text-gray-600">
                        {sbBilties.length} bilties in {sbGroupedByChallan.length} challans
                        {sbChallanFrom && ` | From: ${sbChallanFrom}`}
                        {sbChallanTo && ` | To: ${sbChallanTo}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="bg-white px-3 py-1.5 rounded-lg border border-teal-200">
                      <span className="text-gray-500">Pkg:</span> <span className="font-bold text-gray-800">{Math.round(sbTotals.totalPkg)}</span>
                    </div>
                    <div className="bg-white px-3 py-1.5 rounded-lg border border-teal-200">
                      <span className="text-gray-500">Wt:</span> <span className="font-bold text-gray-800">{sbTotals.totalWt.toFixed(1)}</span>
                    </div>
                    <div className="bg-white px-3 py-1.5 rounded-lg border border-teal-200">
                      <span className="text-gray-500">Amt:</span> <span className="font-bold text-gray-800">₹{sbTotals.totalAmt.toFixed(0)}</span>
                    </div>
                    <div className="bg-white px-3 py-1.5 rounded-lg border border-teal-200">
                      <span className="text-gray-500">Kaat:</span> <span className="font-bold text-emerald-700">₹{sbTotals.totalKaat.toFixed(0)}</span>
                    </div>
                    {sbTotals.totalDD > 0 && (
                      <div className="bg-white px-3 py-1.5 rounded-lg border border-red-200">
                        <span className="text-gray-500">DD:</span> <span className="font-bold text-red-600">₹{sbTotals.totalDD.toFixed(0)}</span>
                      </div>
                    )}
                    <div className="bg-teal-600 text-white px-3 py-1.5 rounded-lg font-bold">
                      PF: ₹{sbTotals.totalPF.toFixed(0)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Loading */}
            {sbLoading && (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <Loader2 className="w-10 h-10 animate-spin text-teal-600 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">Searching bilties for {selectedTransport?.transport_name}...</p>
              </div>
            )}

            {/* Results Table — grouped by challan */}
            {!sbLoading && sbBilties.length > 0 && sbGroupedByChallan.map(([challanNo, kaatItems]) => {
              const isExpanded = sbExpandedChallans[challanNo] !== false;
              // Challan subtotals
              let cPkg = 0, cWt = 0, cAmt = 0, cKaat = 0, cDD = 0;
              kaatItems.forEach(k => {
                const detail = sbBiltyDetails[k.gr_no];
                const bilty = detail?.bilty;
                const station = detail?.station;
                const weight = parseFloat(bilty?.wt || station?.weight || 0);
                const packages = parseFloat(bilty?.no_of_pkg || station?.no_of_packets || 0);
                const effectiveWeight = Math.max(weight, 50);
                const rateKg = parseFloat(k.rate_per_kg) || 0;
                const ratePkg = parseFloat(k.rate_per_pkg) || 0;
                let kaatAmt = 0;
                if (k.rate_type === 'per_kg') kaatAmt = effectiveWeight * rateKg;
                else if (k.rate_type === 'per_pkg') kaatAmt = packages * ratePkg;
                else if (k.rate_type === 'hybrid') kaatAmt = (effectiveWeight * rateKg) + (packages * ratePkg);
                const ddChrg = parseFloat(k.dd_chrg) || 0;
                const payMode = (bilty?.payment_mode || station?.payment_status || '').toUpperCase();
                const isPaid = payMode.includes('PAID');
                const amt = isPaid ? 0 : parseFloat(bilty?.total || station?.amount || 0);
                cPkg += packages; cWt += weight; cAmt += amt; cKaat += kaatAmt; cDD += ddChrg;
              });
              const cPF = cAmt - cKaat - cDD;

              return (
                <div key={challanNo} className="bg-white rounded-xl shadow-lg overflow-hidden">
                  {/* Challan Header */}
                  <button
                    onClick={() => toggleSbChallan(challanNo)}
                    className="w-full flex items-center justify-between px-5 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 text-white hover:from-teal-700 hover:to-emerald-700 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      <Hash className="w-4 h-4" />
                      <span className="font-bold">Challan {challanNo}</span>
                      <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-medium">{kaatItems.length} bilties</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-medium">
                      <span>Pkg: {Math.round(cPkg)}</span>
                      <span>Wt: {cWt.toFixed(1)}</span>
                      <span>Amt: ₹{cAmt.toFixed(0)}</span>
                      <span>Kaat: ₹{cKaat.toFixed(0)}</span>
                      {cDD > 0 && <span className="text-red-200">DD: -₹{cDD.toFixed(0)}</span>}
                      <span className="bg-white/20 px-2 py-0.5 rounded-full font-bold">PF: ₹{cPF.toFixed(0)}</span>
                    </div>
                  </button>

                  {/* Bilties Table */}
                  {isExpanded && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">#</th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">GR No.</th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">P/B No.</th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Consignor</th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Consignee</th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Dest</th>
                            <th className="px-3 py-2 text-center text-xs font-bold text-gray-500 uppercase">Pay</th>
                            <th className="px-3 py-2 text-center text-xs font-bold text-gray-500 uppercase">Pkg</th>
                            <th className="px-3 py-2 text-right text-xs font-bold text-gray-500 uppercase">Wt</th>
                            <th className="px-3 py-2 text-right text-xs font-bold text-gray-500 uppercase">Amt</th>
                            <th className="px-3 py-2 text-right text-xs font-bold text-gray-500 uppercase">DD</th>
                            <th className="px-3 py-2 text-right text-xs font-bold text-gray-500 uppercase">Kaat</th>
                            <th className="px-3 py-2 text-right text-xs font-bold text-gray-500 uppercase">Rate</th>
                            <th className="px-3 py-2 text-right text-xs font-bold text-gray-500 uppercase">PF</th>
                          </tr>
                        </thead>
                        <tbody>
                          {kaatItems.map((k, idx) => {
                            const detail = sbBiltyDetails[k.gr_no] || {};
                            const bilty = detail.bilty;
                            const station = detail.station;
                            const weight = parseFloat(bilty?.wt || station?.weight || 0);
                            const packages = parseFloat(bilty?.no_of_pkg || station?.no_of_packets || 0);
                            const effectiveWeight = Math.max(weight, 50);
                            const rateKg = parseFloat(k.rate_per_kg) || 0;
                            const ratePkg = parseFloat(k.rate_per_pkg) || 0;
                            let kaatAmt = 0;
                            if (k.rate_type === 'per_kg') kaatAmt = effectiveWeight * rateKg;
                            else if (k.rate_type === 'per_pkg') kaatAmt = packages * ratePkg;
                            else if (k.rate_type === 'hybrid') kaatAmt = (effectiveWeight * rateKg) + (packages * ratePkg);
                            const ddChrg = parseFloat(k.dd_chrg) || 0;
                            const payMode = (bilty?.payment_mode || station?.payment_status || '').toUpperCase();
                            const isPaid = payMode.includes('PAID');
                            const amt = isPaid ? 0 : parseFloat(bilty?.total || station?.amount || 0);
                            const pf = amt - kaatAmt - ddChrg;
                            const payDisplay = bilty?.payment_mode?.toUpperCase() || station?.payment_status?.toUpperCase() || '-';
                            const ddSuffix = (bilty?.delivery_type || station?.delivery_type || '').toLowerCase().includes('door') ? '/DD' : '';
                            const dateStr = bilty?.bilty_date ? format(new Date(bilty.bilty_date), 'dd/MM/yy') : station?.created_at ? format(new Date(station.created_at), 'dd/MM/yy') : '-';

                            // Dest city
                            let destName = '-';
                            if (k.destination_city_id && sbCitiesMap[k.destination_city_id]) destName = sbCitiesMap[k.destination_city_id];
                            else if (bilty?.to_city_id && sbCitiesMap[bilty.to_city_id]) destName = sbCitiesMap[bilty.to_city_id];

                            // Rate display
                            let rateDisplay = '-';
                            if (k.rate_type === 'per_kg') rateDisplay = `₹${rateKg}/kg`;
                            else if (k.rate_type === 'per_pkg') rateDisplay = `₹${ratePkg}/pkg`;
                            else if (k.rate_type === 'hybrid') rateDisplay = `₹${rateKg}/kg + ₹${ratePkg}/pkg`;

                            // P/B No.
                            const pohonchBilty = k.pohonch_no && k.bilty_number ? `${k.pohonch_no}/${k.bilty_number}` : k.pohonch_no || k.bilty_number || '-';

                            return (
                              <tr key={k.gr_no || idx} className={`border-b border-gray-100 hover:bg-gray-50 ${isPaid ? 'bg-yellow-50/50' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                                <td className="px-3 py-2 text-gray-500 font-mono text-xs">{idx + 1}</td>
                                <td className="px-3 py-2 font-mono font-semibold text-gray-800">{k.gr_no || '-'}</td>
                                <td className="px-3 py-2 text-gray-700 text-xs">{pohonchBilty}</td>
                                <td className="px-3 py-2 text-gray-600 text-xs">{dateStr}</td>
                                <td className="px-3 py-2 text-gray-700 truncate max-w-[120px]" title={bilty?.consignor_name || station?.consignor || '-'}>{(bilty?.consignor_name || station?.consignor || '-').substring(0, 15)}</td>
                                <td className="px-3 py-2 text-gray-700 truncate max-w-[120px]" title={bilty?.consignee_name || station?.consignee || '-'}>{(bilty?.consignee_name || station?.consignee || '-').substring(0, 15)}</td>
                                <td className="px-3 py-2 text-gray-600 text-xs">{destName.substring(0, 12)}</td>
                                <td className="px-3 py-2 text-center">
                                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                                    isPaid ? 'bg-yellow-100 text-yellow-700' : payMode.includes('TO PAY') || payMode.includes('TO-PAY') ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {payDisplay}{ddSuffix}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-center font-medium">{packages}</td>
                                <td className="px-3 py-2 text-right font-medium">{weight.toFixed(1)}</td>
                                <td className="px-3 py-2 text-right font-medium">{isPaid ? <span className="text-yellow-600 text-xs">PAID</span> : `₹${amt.toFixed(0)}`}</td>
                                <td className="px-3 py-2 text-right">{ddChrg > 0 ? <span className="text-red-600 font-medium">-₹{ddChrg.toFixed(0)}</span> : '-'}</td>
                                <td className="px-3 py-2 text-right font-medium text-emerald-700">₹{kaatAmt.toFixed(0)}</td>
                                <td className="px-3 py-2 text-right text-xs text-gray-500">{rateDisplay}</td>
                                <td className="px-3 py-2 text-right font-bold text-teal-700">₹{pf.toFixed(0)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Empty state */}
            {!sbLoading && sbBilties.length === 0 && selectedTransport && !sbError && (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No bilties found for this transport</p>
                <p className="text-gray-400 text-sm mt-1">Try adjusting the challan range or search a different transport</p>
              </div>
            )}

            {/* Initial state */}
            {!sbLoading && sbBilties.length === 0 && !selectedTransport && !sbError && (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <Truck className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Search for a transport to view bilties</p>
                <p className="text-gray-400 text-sm mt-1">Type transport name or GST number, select from suggestions, then click Search</p>
              </div>
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
