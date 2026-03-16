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
  X
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

        {/* ======== EXISTING BILLS (Print) ======== */}
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
